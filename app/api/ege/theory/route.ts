import { NextResponse } from 'next/server';
import { llmJson, type MistralMessage } from '@/lib/llm';
import { getTaskById } from '@/lib/ege-tasks';
import type { LessonScript } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYSTEM = `Ты — методист по профильной математике ЕГЭ. Сгенерируй короткий теоретический мини-урок (4-6 сцен, 3-6 минут) по конкретному номеру задания.
Верни СТРОГО валидный JSON LessonScript:
{
  "title": string,
  "duration_sec": number,    // 240-420
  "scenes": Scene[]          // 4-6
}
Scene = {
  "type": "intro"|"explain"|"formula"|"example"|"outro",
  "tts": string,         // ОБЯЗАТЕЛЬНО разговорный русский, 1-3 предложения, который произнесёт диктор. ЗАПРЕЩЕНО: \\frac, \\sqrt, ^, _, $...$, любые LaTeX-команды и спецсимволы. Все формулы проговаривай СЛОВАМИ: «икс в квадрате», «корень из двух», «эс равно одна вторая а ха». Не используй короткие математические записи в tts.
  "duration": number,    // 4-12
  "avatar_action"?: "wave"|"idle"|"explain"|"point",
  "board_command"?: BoardCommand     // КРАСИВЫЕ формулы пиши сюда, не в tts. По одной формуле на сцену.
}
BoardCommand: одно из:
{ "action": "write_text", "text": string }
{ "action": "write_formula", "latex": string }
{ "action": "draw_triangle", "kind": "right"|"equilateral", "labels": [string,string,string] }
{ "action": "draw_function_graph", "expr": string, "xRange":[number,number] }
{ "action": "draw_3d_solid", "shape":"pyramid"|"cube"|"sphere"|"cone"|"cylinder", "sides"?:number, "height"?:number }
Никакого текста вне JSON.`;

// In-memory cache by taskId
const cache = new Map<number, LessonScript>();

export async function POST(req: Request) {
  const { taskId } = (await req.json().catch(() => ({}))) as { taskId?: number };
  if (typeof taskId !== 'number') return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  const task = getTaskById(taskId);
  if (!task) return NextResponse.json({ error: 'unknown task' }, { status: 404 });

  if (cache.has(taskId)) {
    return NextResponse.json({ script: cache.get(taskId) });
  }

  const messages: MistralMessage[] = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Задание №${task.id}: ${task.title}.\nКонтекст: ${task.topicHint}\nЦель: коротко объяснить базовую теорию, нужную для решения. Не приводи решение конкретной задачи — только теорию.`,
    },
  ];

  try {
    const script = await llmJson<LessonScript>(messages, {
      model: 'fast',
      temperature: 0.4,
      maxTokens: 1800,
    });
    if (!script.scenes?.length) throw new Error('empty scenes');
    cache.set(taskId, script);
    return NextResponse.json({ script });
  } catch (e) {
    console.error('theory llm fail', e);
    // Fallback: minimal script
    const script: LessonScript = {
      title: `${task.id}. ${task.title}`,
      duration_sec: 90,
      scenes: [
        {
          type: 'intro',
          tts: `Разбираем задание ${task.id}: ${task.title}.`,
          duration: 5,
          avatar_action: 'wave',
          board_command: { action: 'write_text', text: `№${task.id}. ${task.title}` },
        },
        {
          type: 'explain',
          tts: task.fallbackTheory,
          duration: 12,
          avatar_action: 'explain',
        },
        {
          type: 'outro',
          tts: 'Когда готов — нажми «Просмотрено» и переходи к практике.',
          duration: 5,
          avatar_action: 'idle',
        },
      ],
    };
    cache.set(taskId, script);
    return NextResponse.json({ script });
  }
}
