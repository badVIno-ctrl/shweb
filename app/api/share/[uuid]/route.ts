import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { llmChat } from '@/lib/llm';
import type { BoardCommand } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { uuid: string } }) {
  const snap = await prisma.boardSnapshot.findUnique({ where: { uuid: ctx.params.uuid } });
  if (!snap) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const lesson = snap.lessonId
    ? await prisma.lesson.findUnique({ where: { id: snap.lessonId } })
    : null;
  let commands: BoardCommand[] = [];
  try {
    commands = JSON.parse(snap.stateJson) as BoardCommand[];
  } catch {
    commands = [];
  }

  // Generate a friendly intro that picks up where the board state left off.
  let intro = `Привет! Расскажу с того места, где вы остановились${lesson ? ` — урок «${lesson.title}»` : ''}.`;
  try {
    intro = await llmChat(
      [
        {
          role: 'system',
          content:
            'Ты дружелюбный учитель математики. Дай короткое (2 предложения) приветствие, отметь, что продолжаешь с места доски. Без LaTeX, без форматирования.',
        },
        {
          role: 'user',
          content: `Состояние доски (последние команды): ${JSON.stringify(commands).slice(0, 1500)}\nУрок: ${lesson?.title ?? 'свободный'}`,
        },
      ],
      { model: 'fast', temperature: 0.6, maxTokens: 200 },
    );
  } catch {
    /* ignore — fallback intro */
  }

  return NextResponse.json({
    uuid: snap.uuid,
    lesson: lesson ? { title: lesson.title, slug: lesson.slug } : null,
    commands,
    intro,
  });
}
