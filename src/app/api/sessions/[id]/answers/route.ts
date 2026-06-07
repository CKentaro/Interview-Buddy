import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decideNextStep } from "@/lib/decideNextStep";
import { generateFollowUpQuestion } from "@/lib/llm";
import { runFeedbackGeneration } from "@/lib/feedbackGenerator";
import { QuestionType } from "@/generated/prisma/enums";
import type { FollowUpContext, QAPair } from "@/lib/llm";
import type { AnswerResponse } from "@/types/api";

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. 認証チェック
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. パスパラメータ取得（Next.js 16: params は Promise）
  const { id: sessionId } = await params;

  // 3. リクエストのバリデーション
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { questionId, answerText } = parsed.data;

  // 4. セッション認可チェック（このユーザーのセッションか）
  const interviewSession = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!interviewSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // 5. 質問の取得・セッション帰属確認
  const answeredQuestion = await prisma.question.findFirst({
    where: { id: questionId, sessionId },
  });
  if (!answeredQuestion) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // 6. 二重回答チェック
  const existing = await prisma.answer.findUnique({
    where: { questionId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "この質問にはすでに回答済みです" },
      { status: 409 },
    );
  }

  // 7. 親メイン質問を特定
  const parentMainQuestion =
    answeredQuestion.type === QuestionType.MAIN
      ? answeredQuestion
      : await prisma.question.findFirstOrThrow({
          where: { id: answeredQuestion.parentQuestionId ?? undefined },
        });

  // 8. 次のメイン質問を先にフェッチ（pure function に渡すため）
  const nextMainQuestion = await prisma.question.findFirst({
    where: {
      sessionId,
      type: QuestionType.MAIN,
      displayOrder: parentMainQuestion.displayOrder + 1,
    },
  });

  // 9. 分岐判定
  const decision = decideNextStep({
    answeredQuestionDepthCount: answeredQuestion.depthCount,
    nextMainQuestion: nextMainQuestion
      ? {
          id: nextMainQuestion.id,
          content: nextMainQuestion.content,
          displayOrder: nextMainQuestion.displayOrder,
          primaryAxis: nextMainQuestion.primaryAxis,
        }
      : null,
  });

  // 10. Answer を保存（単一 write、トランザクション不要）
  const savedAnswer = await prisma.answer.create({
    data: { content: answerText, questionId },
  });

  // 11. 分岐ごとの処理
  if (decision.action === "followup") {
    // 文脈を構築
    const treeQuestions = await prisma.question.findMany({
      where: {
        sessionId,
        OR: [
          { id: parentMainQuestion.id },
          { parentQuestionId: parentMainQuestion.id },
        ],
      },
      include: { answer: true },
      orderBy: { displayOrder: "asc" },
    });

    const conversationHistory: QAPair[] = treeQuestions.map((q) => ({
      questionText: q.content,
      answerText: q.answer?.content ?? null,
    }));

    const context: FollowUpContext = {
      parentMainQuestionText: parentMainQuestion.content,
      axis: parentMainQuestion.primaryAxis!,
      conversationHistory,
    };

    // Gemini で深掘り質問を生成
    let generated: { displayText: string; speechText: string };
    try {
      generated = await generateFollowUpQuestion(context);
    } catch (err) {
      console.error("Gemini API error:", err);
      return NextResponse.json(
        { error: "質問の生成に失敗しました。もう一度お試しください。" },
        { status: 502 },
      );
    }

    // displayOrder: セッション内の最大値 + 1
    const maxOrderResult = await prisma.question.aggregate({
      where: { sessionId },
      _max: { displayOrder: true },
    });
    const newDisplayOrder = (maxOrderResult._max.displayOrder ?? 0) + 1;
    const newDepthCount = answeredQuestion.depthCount + 1;

    const followUpQuestion = await prisma.question.create({
      data: {
        type: QuestionType.FOLLOW_UP,
        content: generated.displayText,
        displayOrder: newDisplayOrder,
        depthCount: newDepthCount,
        primaryAxis: parentMainQuestion.primaryAxis,
        sessionId,
        parentQuestionId: parentMainQuestion.id,
      },
    });

    const responseBody: AnswerResponse = {
      answerId: savedAnswer.id,
      nextQuestion: {
        id: followUpQuestion.id,
        type: followUpQuestion.type,
        text: followUpQuestion.content,
        parentQuestionId: followUpQuestion.parentQuestionId,
        speechText: generated.speechText,
      },
      isSessionComplete: false,
    };
    return NextResponse.json(responseBody, { status: 201 });
  }

  if (decision.action === "next_main") {
    const responseBody: AnswerResponse = {
      answerId: savedAnswer.id,
      nextQuestion: {
        id: decision.question.id,
        type: QuestionType.MAIN,
        text: decision.question.content,
        parentQuestionId: null,
      },
      isSessionComplete: false,
    };
    return NextResponse.json(responseBody, { status: 201 });
  }

  // complete
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  after(async () => {
    try {
      await runFeedbackGeneration(sessionId);
    } catch (err) {
      console.error(`[feedback generation failed] sessionId=${sessionId}`, err);
    }
  });

  const responseBody: AnswerResponse = {
    answerId: savedAnswer.id,
    nextQuestion: null,
    isSessionComplete: true,
  };
  return NextResponse.json(responseBody, { status: 201 });
}
