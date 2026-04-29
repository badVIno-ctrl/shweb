import { NextResponse } from 'next/server';
import { llmJson, type MistralMessage } from '@/lib/llm';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import type { BoardCommand, ChatTurn } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYSTEM = `Ты — преподаватель профильной математики ЕГЭ. Объясняешь кратко, чётко, на русском.
Отвечай ТОЛЬКО валидным JSON по схеме:
{
  "answer": string,            // короткий текст для TTS, 1-4 предложения
  "board_commands": BoardCommand[]
}
BoardCommand = одно из:
{ "action": "write_text", "text": string }
{ "action": "write_formula", "latex": string }      // LaTeX без $...$
{ "action": "draw_triangle", "kind": "right"|"equilateral"|"arbitrary", "labels": [string,string,string] }
{ "action": "draw_circle", "labels"?: string[] }
{ "action": "draw_function_graph", "expr": string, "xRange": [number, number] }   // expr — выражение в x: например "x*sin(x)"
{ "action": "draw_3d_solid", "shape": "pyramid"|"cube"|"sphere"|"cone"|"cylinder", "sides"?: number, "height"?: number }
{ "action": "highlight", "region": { "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 } }
{ "action": "erase" }

Возвращай 0–4 board_commands. Никаких полей, не предусмотренных схемой.`;

interface ChatBody {
  question: string;
  lessonId?: string;
  history?: ChatTurn[];
}

export async function POST(req: Request) {
  // Burst of 6 requests, then 1 every 6s — protects Mistral budget from
  // accidental client loops or bots. See lib/rate-limit.ts notes.
  const limit = rateLimit(`chat:${clientIp(req)}`, {
    capacity: 6,
    refillPerSec: 1 / 6,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: 'Слишком много вопросов подряд. Подожди немного и спроси снова.',
        retryAfterMs: limit.retryAfterMs,
      },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(limit.retryAfterMs / 1000).toString() },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as ChatBody | null;
  if (!body?.question) return NextResponse.json({ error: 'question required' }, { status: 400 });

  const messages: MistralMessage[] = [{ role: 'system', content: SYSTEM }];
  for (const t of body.history ?? []) {
    if (t.role === 'system') continue;
    messages.push({ role: t.role, content: t.content });
  }
  messages.push({ role: 'user', content: body.question });

  let answer = '';
  let board_commands: BoardCommand[] = [];
  try {
    const out = await llmJson<{ answer: string; board_commands?: BoardCommand[] }>(messages, {
      model: 'fast',
      temperature: 0.4,
      maxTokens: 900,
    });
    answer = (out.answer || '').toString().trim();
    board_commands = Array.isArray(out.board_commands) ? out.board_commands : [];
  } catch (e) {
    answer =
      'Не удалось получить ответ от модели. Попробуй ещё раз через минуту или сформулируй вопрос проще.';
    board_commands = [];
    console.error('chat llm error', e);
  }

  // Persist (best-effort)
  try {
    const user = await getCurrentUser();
    await prisma.chatMessage.createMany({
      data: [
        { userId: user.id, lessonId: body.lessonId, role: 'user', content: body.question },
        {
          userId: user.id,
          lessonId: body.lessonId,
          role: 'assistant',
          content: answer,
        },
      ],
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ answer, board_commands });
}
