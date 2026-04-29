import { NextResponse } from 'next/server';
import { llmJson, type MistralMessage } from '@/lib/llm';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import type { LessonScript } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYSTEM = `Ты — методист по профильной математике ЕГЭ. Сгенерируй короткий урок по теме.
Верни СТРОГО валидный JSON LessonScript:
{
  "title": string,
  "duration_sec": number,    // 360-720
  "scenes": Scene[]          // 5-8 элементов
}
Scene:
{
  "type": "intro"|"board_draw"|"formula"|"explain"|"example"|"graph"|"practice"|"outro",
  "tts": string,             // текст для озвучки (1-3 предложения, на русском, без LaTeX)
  "duration": number,        // 4-12 сек
  "avatar_action"?: "wave"|"idle"|"explain"|"listen"|"point",
  "board_command"?: BoardCommand
}
BoardCommand: одно из:
{ "action": "write_text", "text": string }
{ "action": "write_formula", "latex": string }                              // LaTeX без $
{ "action": "draw_triangle", "kind": "right"|"equilateral", "labels": [string,string,string] }
{ "action": "draw_circle", "labels"?: string[] }
{ "action": "draw_function_graph", "expr": string, "xRange":[number,number] }
{ "action": "draw_3d_solid", "shape":"pyramid"|"cube"|"sphere"|"cone"|"cylinder", "sides"?:number, "height"?:number }
{ "action": "highlight", "region":{ "x":number,"y":number,"w":number,"h":number } }
Никаких комментариев и текста вне JSON.`;

export async function POST(req: Request) {
  const { topic } = (await req.json().catch(() => ({}))) as { topic?: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const messages: MistralMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Тема: ${topic}` },
  ];
  let script: LessonScript;
  try {
    script = await llmJson<LessonScript>(messages, {
      model: 'hard',
      temperature: 0.5,
      maxTokens: 2200,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'llm failed' },
      { status: 502 },
    );
  }

  // Validate minimally
  if (!script.title || !Array.isArray(script.scenes) || script.scenes.length === 0) {
    return NextResponse.json({ error: 'invalid script from model' }, { status: 502 });
  }

  // Persist as a lesson (slug "gen-<...>")
  const baseSlug = `gen-${slugify(topic) || 'lesson'}`;
  let slug = baseSlug;
  for (let i = 1; await prisma.lesson.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
    if (i > 50) break;
  }
  const lesson = await prisma.lesson.create({
    data: {
      slug,
      title: script.title,
      topic: 'Сгенерировано',
      durationSec: script.duration_sec ?? 480,
      isPro: false,
      script: JSON.stringify(script),
    },
  });

  return NextResponse.json({ slug: lesson.slug, lessonId: lesson.id, script });
}
