import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { selectMainQuestions } from "@/lib/selectMainQuestions";
import { generateOpeningSpeech } from "@/lib/llm";
import { QuestionType } from "@/generated/prisma/enums";
import type { QuestionBank } from "@/types/questionBank";
import type { SessionListResponse } from "@/types/api";
import bankData from "@/data/questionBank.json";

const questionBank = bankData as QuestionBank;

// 選考フェーズ ID → 表示ラベル（冒頭挨拶の生成に使う）
const STAGE_LABELS: Record<string, string> = {
  first: "1次面接",
  second: "2次面接",
  final: "最終面接",
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.interviewSession.findMany({
    // 完了した（最後まで実施した）セッションのみを保存済みとして扱う。
    // 中断されたセッションは endedAt が未設定のため一覧に含めない。
    where: { userId, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      feedback: { select: { id: true } },
    },
  });

  const body: SessionListResponse = {
    sessions: rows.map((r) => ({
      id: r.id,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      companyName: r.companyName,
      industryMajor: r.industryMajor,
      industryMinor: r.industryMinor,
      jobMajor: r.jobMajor,
      jobMinor: r.jobMinor,
      selectionStage: r.selectionStage,
      interviewerType: r.interviewerType,
      questionCount: r._count.questions,
      hasFeedback: r.feedback !== null,
    })),
  };
  return NextResponse.json(body);
}

const createSessionSchema = z.object({
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  industryMajor: z.string().optional(),
  industryMinor: z.string().optional(),
  jobMinor: z.string().optional(),
  selectionStage: z.string().optional(),
  difficulty: z.string().optional(),
  interviewerType: z.string().optional(),
  voiceEnabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    jobTitle,
    companyName,
    industryMajor,
    industryMinor,
    jobMinor,
    selectionStage,
    difficulty,
    interviewerType,
    voiceEnabled,
  } = parsed.data;

  const selectedQuestions = selectMainQuestions(questionBank);

  const { interviewSession, firstDbQuestion } = await prisma.$transaction(async (tx) => {
    const interviewSession = await tx.interviewSession.create({
      data: {
        userId,
        jobMajor: jobTitle,
        companyName,
        industryMajor,
        industryMinor,
        jobMinor,
        selectionStage,
        difficulty,
        interviewerType,
      },
    });

    await tx.question.createMany({
      data: selectedQuestions.map((q) => ({
        type: QuestionType.MAIN,
        content: q.displayText,
        displayOrder: q.displayOrder,
        primaryAxis: q.axis,
        sessionId: interviewSession.id,
      })),
    });

    const firstDbQuestion = await tx.question.findFirstOrThrow({
      where: { sessionId: interviewSession.id, displayOrder: 1 },
    });

    return { interviewSession, firstDbQuestion };
  });

  const firstSelected = selectedQuestions[0];
  if (!firstSelected) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  // 音声 ON のときだけ、冒頭挨拶＋最初の質問の読み上げ文を毎回生成する。
  // 生成に失敗してもバンクの静的 speechText にフォールバックして面接は継続。
  let firstSpeechText = firstSelected.speechText;
  if (voiceEnabled) {
    try {
      const opening = await generateOpeningSpeech({
        companyName: companyName ?? null,
        selectionStageLabel: selectionStage
          ? STAGE_LABELS[selectionStage] ?? null
          : null,
        firstQuestionText: firstSelected.speechText,
      });
      firstSpeechText = opening.speechText;
    } catch (err) {
      console.error("Opening speech generation error:", err);
    }
  }

  const body_: import("@/types/api").SessionResponse = {
    sessionId: interviewSession.id,
    createdAt: interviewSession.startedAt.toISOString(),
    firstQuestion: {
      id: firstDbQuestion.id,
      type: firstDbQuestion.type,
      text: firstDbQuestion.content,
      speechText: firstSpeechText,
      parentQuestionId: firstDbQuestion.parentQuestionId,
    },
  };

  return NextResponse.json(body_, { status: 201 });
}
