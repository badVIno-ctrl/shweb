'use client';

import { useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { Timer } from 'lucide-react';

interface Props {
  studentName: string;
  task: string;
  seconds?: number;
  onAnswer: (text: string) => void;
  onSkip: () => void;
}

export function ColdCall({ studentName, task, seconds = 60, onAnswer, onSkip }: Props) {
  const [left, setLeft] = useState(seconds);
  const [text, setText] = useState('');
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intRef.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (intRef.current) clearInterval(intRef.current);
    };
  }, []);
  useEffect(() => {
    if (left === 0) onSkip();
  }, [left, onSkip]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <GlassPanel className="flex w-[min(560px,90vw)] flex-col gap-3" padding="lg">
        <div className="flex items-center gap-2 text-aurora-3">
          <Timer size={20} strokeWidth={1.5} />
          <span className="font-display text-lg">Холодный звонок · {studentName}</span>
          <span className="ml-auto font-mono text-2xl text-text-primary">{left}с</span>
        </div>
        <p className="text-text-primary">{task}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Твой ответ…"
          className="min-h-20 w-full resize-none rounded-glass border border-white/10 bg-white/[0.03] p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-aurora-2/50"
        />
        <div className="flex justify-end gap-2">
          <GlassButton size="sm" variant="ghost" onClick={onSkip}>
            Пропустить
          </GlassButton>
          <GlassButton size="sm" variant="gold" onClick={() => onAnswer(text)}>
            Ответить
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
}
