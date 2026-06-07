import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EvaluationAxis } from "@/generated/prisma/enums";
import type { FeedbackResponse } from "@/types/api";

const FEEDBACK_TIMEOUT_MS = 90_000;

const AXIS_LABELS: Record<EvaluationAxis, string> = {
  [EvaluationAxis.REPRODUCIBILITY]: "再現性",
  [EvaluationAxis.VALUES_JUDGMENT]: "価値観・判断",
  [EvaluationAxis.SELF_AWARENESS]: "自己認識",
  [EvaluationAxis.WORLDVIEW]: "世界観・知的好奇心",
};

export function determineFeedbackStatus(
  hasFeedback: boolean,
  endedAt: Date | null,
  now: Date,
): "generating" | "completed" | "failed" {
  if (hasFeedback) return "completed";
  if (endedAt === null) return "generating";
  if (now.getTime() - endedAt.getTime() >= FEEDBACK_TIMEOUT_MS) return "failed";
  return "generating";
}

export async function GET(
  _request: Request,
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

  // 3. 認可チェック + Feedback 有無確認（並列）
  const [interviewSession, feedbackExists] = await Promise.all([
    prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      select: { endedAt: true },
    }),
    prisma.feedback.findUnique({
      where: { sessionId },
      select: { id: true },
    }),
  ]);

  if (!interviewSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const status = determineFeedbackStatus(
    feedbackExists !== null,
    interviewSession.endedAt,
    new Date(),
  );

  if (status !== "completed") {
    const body: FeedbackResponse = { status };
    return NextResponse.json(body);
  }

  // 4. completed のときのみ詳細取得
  const feedback = await prisma.feedback.findUnique({
    where: { sessionId },
    include: { axisEvaluations: true },
  });

  if (!feedback) {
    // 第1クエリと第2クエリの間に削除された極めてまれなレースコンディション
    const body: FeedbackResponse = { status: "generating" };
    return NextResponse.json(body);
  }

  const body: FeedbackResponse = {
    status: "completed",
    feedbackId: feedback.id,
    overallComment: feedback.overallComment,
    axisEvaluations: feedback.axisEvaluations.map((ae) => ({
      axis: ae.axis,
      axisLabel: AXIS_LABELS[ae.axis],
      comment: ae.comment,
    })),
  };
  return NextResponse.json(body);
}
