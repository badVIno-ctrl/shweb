import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  const lessons = await prisma.lesson.findMany({ orderBy: { createdAt: 'asc' } });
  const progress = await prisma.progress.findMany({ where: { userId: user.id } });
  const pmap = new Map(progress.map((p) => [p.lessonId, p.score]));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: (user as { role?: string }).role ?? 'user',
      streak: user.streak,
    },
    lessons: lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      topic: l.topic,
      durationSec: l.durationSec,
      isPro: l.isPro,
      progress: pmap.get(l.id) ?? 0,
    })),
  });
}
