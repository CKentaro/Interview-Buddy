import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionDetailResponse } from "@/types/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;

  const interviewSession = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { answer: { select: { id: true, content: true } } },
      },
    },
  });

  if (!interviewSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body: SessionDetailResponse = {
    id: interviewSession.id,
    startedAt: interviewSession.startedAt.toISOString(),
    endedAt: interviewSession.endedAt?.toISOString() ?? null,
    companyName: interviewSession.companyName,
    industryMajor: interviewSession.industryMajor,
    industryMinor: interviewSession.industryMinor,
    jobMajor: interviewSession.jobMajor,
    jobMinor: interviewSession.jobMinor,
    selectionStage: interviewSession.selectionStage,
    interviewerType: interviewSession.interviewerType,
    questions: interviewSession.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      displayOrder: q.displayOrder,
      primaryAxis: q.primaryAxis,
      parentQuestionId: q.parentQuestionId,
      answer: q.answer ? { id: q.answer.id, content: q.answer.content } : null,
    })),
  };

  return NextResponse.json(body);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;

  const interviewSession = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!interviewSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.interviewSession.delete({ where: { id: sessionId } });
  return new NextResponse(null, { status: 204 });
}
