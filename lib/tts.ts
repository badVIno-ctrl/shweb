// Text-to-speech: Yandex SpeechKit primary, Web Speech API fallback (browser side).
// This module exports BOTH a server helper (Yandex) and client helper (Web Speech).

const YANDEX_KEY = process.env.YANDEX_SPEECHKIT_KEY ?? '';
const YANDEX_FOLDER = process.env.YANDEX_SPEECHKIT_FOLDER ?? '';

export const ttsServerAvailable: boolean = Boolean(YANDEX_KEY && YANDEX_FOLDER);

export interface YandexTtsOptions {
  voice?: string; // e.g. 'alena', 'filipp', 'jane', 'omazh'
  emotion?: 'neutral' | 'good' | 'evil';
  speed?: number; // 0.1..3
  format?: 'mp3' | 'oggopus';
}

export async function yandexTts(
  text: string,
  opts: YandexTtsOptions = {},
): Promise<ArrayBuffer> {
  if (!ttsServerAvailable) throw new Error('Yandex SpeechKit not configured');

  const params = new URLSearchParams({
    text,
    lang: 'ru-RU',
    voice: opts.voice ?? 'alena',
    emotion: opts.emotion ?? 'good',
    speed: String(opts.speed ?? 1),
    format: opts.format ?? 'mp3',
    folderId: YANDEX_FOLDER,
  });

  const res = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Api-Key ${YANDEX_KEY}`,
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Yandex TTS ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

// ---------- Client-side helpers ----------

export interface ClientSpeakHandle {
  audio?: HTMLAudioElement;
  utterance?: SpeechSynthesisUtterance;
  stop: () => void;
  ended: Promise<void>;
}

export interface ClientSpeakOptions {
  rate?: number;
  voice?: string;
  preferServer?: boolean;
}

/** Speak text on client. Tries /api/tts (server) first if preferServer; else falls back to Web Speech. */
export async function clientSpeak(
  text: string,
  options: ClientSpeakOptions = {},
): Promise<ClientSpeakHandle> {
  const rate = options.rate ?? 1;

  // Try server TTS
  if (options.preferServer !== false) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: options.voice }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = rate;
        const ended = new Promise<void>((resolve) => {
          audio.addEventListener('ended', () => {
            URL.revokeObjectURL(url);
            resolve();
          });
          audio.addEventListener('error', () => resolve());
        });
        await audio.play().catch(() => undefined);
        return {
          audio,
          ended,
          stop: () => {
            audio.pause();
            URL.revokeObjectURL(url);
          },
        };
      }
    } catch {
      // fall through
    }
  }

  // Web Speech fallback
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { stop: () => undefined, ended: Promise.resolve() };
  }
  const synth = window.speechSynthesis;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ru-RU';
  utt.rate = rate;
  const voices = synth.getVoices();
  const ru = voices.find((v) => v.lang?.toLowerCase().startsWith('ru')) ?? voices[0];
  if (ru) utt.voice = ru;
  const ended = new Promise<void>((resolve) => {
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
  });
  synth.speak(utt);
  return {
    utterance: utt,
    ended,
    stop: () => synth.cancel(),
  };
}
