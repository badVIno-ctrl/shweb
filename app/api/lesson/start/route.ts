import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { LessonScript } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { slug, lessonId } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    lessonId?: string;
  };
  if (!slug && !lessonId) {
    return NextResponse.json({ error: 'slug or lessonId required' }, { status: 400 });
  }
  const lesson = await prisma.lesson.findFirst({
    where: slug ? { slug } : { id: lessonId },
  });
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  const script = JSON.parse(lesson.script) as LessonScript;
  return NextResponse.json({
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      durationSec: lesson.durationSec,
    },
    script,
  });
}
