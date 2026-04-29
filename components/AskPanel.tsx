'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { cn } from '@/lib/utils';

interface AskPanelProps {
  thinking: boolean;
  onAsk: (question: string) => void;
}

export function AskPanel({ thinking, onAsk }: AskPanelProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<unknown>(null);

  useEffect(() => () => {
    recRef.current?.stop();
  }, []);

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      const r = recogRef.current as { stop?: () => void } | null;
      r?.stop?.();
      setRecording(false);
      return;
    }
    setRecording(true);

    // Try Web Speech Recognition first (instant, no upload).
    const SR =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR() as {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          start: () => void;
          stop: () => void;
          onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
          onend: () => void;
          onerror: () => void;
        };
        rec.lang = 'ru-RU';
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e) => {
          let acc = '';
          for (let i = 0; i < e.results.length; i++) acc += e.results[i][0].transcript;
          setText(acc);
        };
        rec.onend = () => setRecording(false);
        rec.onerror = () => setRecording(false);
        rec.start();
        recogRef.current = rec;
        return;
      } catch {
        // fall through to MediaRecorder fallback
      }
    }

    // MediaRecorder fallback — collect audio, do nothing fancy with it.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
    } catch {
      setRecording(false);
    }
  }

  function submit() {
    const q = text.trim();
    if (!q || thinking) return;
    onAsk(q);
    setText('');
  }

  return (
    <GlassPanel className="flex w-80 flex-col gap-3" padding="md">
      <div className="flex items-center justify-between">
        <div className="font-display text-base font-semibold">Спросить учителя</div>
        {thinking && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            думает
            <span className="ml-1 inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-2" />
              <span
                className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-2"
                style={{ animationDelay: '120ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-2"
                style={{ animationDelay: '240ms' }}
              />
            </span>
          </div>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Например: почему √2 иррационально?"
        className="min-h-24 w-full resize-none rounded-glass border border-white/10 bg-white/[0.03] p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-aurora-2/50"
        disabled={thinking}
      />

      <div className="flex items-center gap-2">
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={toggleRecord}
          className={cn(recording && 'text-aurora-3')}
          title={recording ? 'Остановить запись' : 'Голосом'}
        >
          {recording ? <X size={18} strokeWidth={1.5} /> : <Mic size={18} strokeWidth={1.5} />}
        </GlassButton>
        <GlassButton size="sm" variant="gold" onClick={submit} disabled={thinking || !text.trim()}>
          <Send size={18} strokeWidth={1.5} />
          Спросить
        </GlassButton>
      </div>
    </GlassPanel>
  );
}
