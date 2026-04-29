import { NextResponse } from 'next/server';
import { ttsServerAvailable, yandexTts } from '@/lib/tts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { text, voice } = (await req.json().catch(() => ({}))) as {
    text?: string;
    voice?: string;
  };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (!ttsServerAvailable) {
    // signal client to fall back to Web Speech
    return NextResponse.json({ error: 'server tts disabled' }, { status: 501 });
  }
  try {
    const buf = await yandexTts(text, { voice });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'tts failed' },
      { status: 500 },
    );
  }
}
