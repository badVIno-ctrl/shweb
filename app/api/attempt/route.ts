import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { lessonId, score } = (await req.json().catch(() => ({}))) as {
    lessonId?: string;
    score?: number;
  };
  if (!lessonId || typeof score !== 'number') {
    return NextResponse.json({ error: 'lessonId & score required' }, { status: 400 });
  }
  const user = await getCurrentUser();
  await prisma.attempt.create({ data: { userId: user.id, lessonId, score } });
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { score: Math.max(score, 0), completedAt: score >= 70 ? new Date() : null },
    create: {
      userId: user.id,
      lessonId,
      score,
      completedAt: score >= 70 ? new Date() : null,
    },
  });
  return NextResponse.json({ ok: true });
}
