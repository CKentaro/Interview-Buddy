import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserMeResponse } from "@/types/api";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, totalSessions, lastSession] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.interviewSession.count({ where: { userId } }),
    prisma.interviewSession.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const body: UserMeResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    totalSessions,
    lastSessionAt: lastSession?.startedAt.toISOString() ?? null,
  };
  return NextResponse.json(body);
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
