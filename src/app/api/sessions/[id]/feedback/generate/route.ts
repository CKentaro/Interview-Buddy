import { after } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runFeedbackGeneration } from "@/lib/feedbackGenerator";

export async function POST(
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

  // 3. セッション認可チェック（自分のセッションか）
  const interviewSession = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!interviewSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // 4. セッション完了チェック
  if (!interviewSession.endedAt) {
    return NextResponse.json(
      { error: "Interview session is not completed yet" },
      { status: 409 },
    );
  }

  // 5. 二重生成防止: 既に Feedback が存在すれば即返す
  const existing = await prisma.feedback.findUnique({
    where: { sessionId },
  });
  if (existing) {
    return NextResponse.json(
      { message: "Feedback already exists" },
      { status: 200 },
    );
  }

  // 6. レスポンス後にバックグラウンドで生成を実行
  after(async () => {
    try {
      await runFeedbackGeneration(sessionId);
    } catch (err) {
      console.error(`[feedback generation failed] sessionId=${sessionId}`, err);
    }
  });

  return NextResponse.json(
    { message: "Feedback generation started" },
    { status: 202 },
  );
}
