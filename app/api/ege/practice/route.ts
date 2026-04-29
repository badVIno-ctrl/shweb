import { NextResponse } from 'next/server';
import { llmJson, type MistralMessage } from '@/lib/llm';
import { getTaskById } from '@/lib/ege-tasks';

export const dynamic = 'force-dynamic';

const SYSTEM = `Ты — составитель задач профильной математики ЕГЭ. Сгенерируй ОДНУ задачу указанного номера ЕГЭ.
Верни строго JSON:
{
  "statement": string,    // условие задачи на русском (можно с LaTeX внутри $...$)
  "answer": string,       // короткий ответ (число, выражение или список через запятую)
  "hints": string[],      // 2-3 подсказки от простой к более полной
  "solution": string      // короткое решение (3-6 предложений)
}
Без текста вне JSON.`;

interface PracticeBody {
  taskId: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  exclude?: string[]; // statements уже виденных задач
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PracticeBody | null;
  if (!body || typeof body.taskId !== 'number')
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  const task = getTaskById(body.taskId);
  if (!task) return NextResponse.json({ error: 'unknown task' }, { status: 404 });

  const messages: MistralMessage[] = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Задание №${task.id}: ${task.title}.\nКонтекст: ${task.topicHint}\nСложность: ${
        body.difficulty ?? 'medium'
      }\nДай новую задачу, отличающуюся от: ${(body.exclude ?? []).slice(-3).join(' | ') || '—'}.\nОтвет должен быть однозначным.`,
    },
  ];

  try {
    const out = await llmJson<{
      statement: string;
      answer: string;
      hints: string[];
      solution: string;
    }>(messages, { model: 'fast', temperature: 0.7, maxTokens: 900 });
    return NextResponse.json(out);
  } catch (e) {
    console.error('practice llm fail', e);
    return NextResponse.json({
      statement: `Задача по теме «${task.title}» временно недоступна. Попробуй ещё раз через минуту.`,
      answer: '',
      hints: [task.fallbackTheory],
      solution: '',
    });
  }
}

interface CheckBody {
  taskId: number;
  statement: string;
  expected: string;
  answer: string;
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as CheckBody | null;
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 });

  // Quick string compare (normalised)
  const norm = (s: string) =>
    s.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/[(){}]/g, '');
  const exact = norm(body.expected) === norm(body.answer);
  if (exact) {
    return NextResponse.json({
      correct: true,
      feedback: 'Верно! Отличная работа.',
    });
  }

  // Fall back to LLM judgement for non-trivial answers
  const messages: MistralMessage[] = [
    {
      role: 'system',
      content:
        'Ты — проверяющий по математике. Верни JSON {"correct": boolean, "feedback": string}. feedback ≤ 2 предложений на русском.',
    },
    {
      role: 'user',
      content: `Задача: ${body.statement}\nЭталонный ответ: ${body.expected}\nОтвет ученика: ${body.answer}\nЭкквивалентны ли они математически?`,
    },
  ];
  try {
    const out = await llmJson<{ correct: boolean; feedback: string }>(messages, {
      model: 'fast',
      temperature: 0,
      maxTokens: 200,
    });
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({
      correct: false,
      feedback: `Эталонный ответ: ${body.expected}.`,
    });
  }
}
