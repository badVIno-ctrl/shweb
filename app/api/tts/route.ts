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
    // No Yandex creds → return 204 (No Content) with a hint header so the
    // client cleanly falls back to Web Speech without polluting dev logs
    // with red 5xx-style entries.
    return new NextResponse(null, {
      status: 204,
      headers: { 'X-TTS-Fallback': 'web-speech' },
    });
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
