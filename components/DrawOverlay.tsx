'use client';

// Free-hand drawing overlay used in `interactive: 'draw'` scenes.
// Captures strokes, sends to /api/chat for feedback.

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { Eraser, Send } from 'lucide-react';

interface Props {
  prompt: string;
  onFeedback: (feedback: string) => void;
  onClose: () => void;
}

export function DrawOverlay({ prompt, onFeedback, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Array<Array<[number, number]>>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = c.clientWidth;
    c.height = c.clientHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(15,20,36,0.85)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#7AE7C7';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    strokesRef.current.push([pos(e)]);
    const ctx = canvasRef.current!.getContext('2d')!;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const [x, y] = pos(e);
    strokesRef.current[strokesRef.current.length - 1].push([x, y]);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function up() {
    drawingRef.current = false;
  }

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(15,20,36,0.85)';
    ctx.fillRect(0, 0, c.width, c.height);
    strokesRef.current = [];
  }

  async function send() {
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Ученик нарисовал на доске. Задача: ${prompt}\nКоординаты штрихов: ${JSON.stringify(
            strokesRef.current,
          ).slice(0, 4000)}\nДай короткий конкретный фидбек на русском.`,
        }),
      });
      const data = (await res.json()) as { answer?: string };
      onFeedback(data.answer ?? 'Не получилось проверить, попробуй ещё раз.');
    } catch {
      onFeedback('Не удалось получить фидбек.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <GlassPanel className="flex w-[min(900px,90vw)] flex-col gap-3" padding="lg">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg">Дорисуй сам</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>
        <p className="text-sm text-text-muted">{prompt}</p>
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="h-80 w-full rounded-glass border border-white/10"
        />
        <div className="flex justify-end gap-2">
          <GlassButton size="sm" variant="ghost" onClick={clear}>
            <Eraser size={18} strokeWidth={1.5} />
            Очистить
          </GlassButton>
          <GlassButton size="sm" variant="gold" onClick={send} disabled={busy}>
            <Send size={18} strokeWidth={1.5} />
            {busy ? 'Проверяю…' : 'Проверить'}
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
}
