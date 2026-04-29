'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Pause, CheckCircle2, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { AnimatedTeacher } from './AnimatedTeacher';
import type { BlackboardHandle } from './Blackboard';
import { clientSpeak, type ClientSpeakHandle } from '@/lib/tts';
import { sanitizeTts } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { prettifyFormula } from '@/lib/board-renderer';
import type { AvatarAction, LessonScript } from '@/lib/types';
import type { EgeTask } from '@/lib/ege-tasks';

// Lazy-load Scene3D so it doesn't block first render and gracefully falls back
const Scene3D = dynamic(() => import('./Scene3D').then((m) => m.Scene3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-text-muted">
      Загружаю 3D-учителя…
    </div>
  ),
});

const AVATAR_URL =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR ??
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

interface Props {
  task: EgeTask;
  onWatched: () => void;
}

export function EgeTheoryPlayer({ task, onWatched }: Props) {
  const [script, setScript] = useState<LessonScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [avatarAction, setAvatarAction] = useState<AvatarAction>('idle');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [use3d, setUse3d] = useState(true);
  const [bigBoard, setBigBoard] = useState(false);
  const blackboardRef = useRef<BlackboardHandle>(null);
  const handleRef = useRef<ClientSpeakHandle | null>(null);
  const cancelledRef = useRef(false);

  // Fetch theory whenever task changes
  useEffect(() => {
    cancelledRef.current = false;
    setScript(null);
    setIdx(0);
    setDone(false);
    setLoading(true);
    apiFetch('/api/ege/theory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    })
      .then((r) => r.json())
      .then((d: { script?: LessonScript }) => {
        if (cancelledRef.current) return;
        if (d.script) setScript(d.script);
      })
      .finally(() => !cancelledRef.current && setLoading(false));
    return () => {
      cancelledRef.current = true;
      handleRef.current?.stop();
      setPlaying(false);
    };
  }, [task.id]);

  // Reset board when script changes
  useEffect(() => {
    if (script) {
      blackboardRef.current?.reset?.();
      // Show task title on the board
      blackboardRef.current?.exec?.({
        action: 'write_text',
        text: `№${task.id}. ${task.title}`,
      });
    }
  }, [script, task.id, task.title]);

  // Sequential playback
  useEffect(() => {
    if (!script || !playing) return;
    let stopped = false;
    (async () => {
      for (let i = idx; i < script.scenes.length; i++) {
        if (stopped) return;
        setIdx(i);
        const scene = script.scenes[i];
        if (scene.avatar_action) setAvatarAction(scene.avatar_action);
        else setAvatarAction('explain');
        if (scene.board_command) {
          blackboardRef.current?.exec?.(scene.board_command);
        }
        try {
          const text = sanitizeTts(scene.tts);
          const h = await clientSpeak(text, { rate: 1 });
          handleRef.current = h;
          setAudio(h.audio ?? null);
          await h.ended;
          setAudio(null);
        } catch {
          /* ignore */
        }
        if (stopped) return;
      }
      setAvatarAction('idle');
      setPlaying(false);
      setDone(true);
    })();
    return () => {
      stopped = true;
      handleRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, script]);

  function toggle() {
    if (!script) return;
    if (playing) {
      handleRef.current?.stop();
      setPlaying(false);
    } else {
      if (done) {
        blackboardRef.current?.reset?.();
        setIdx(0);
        setDone(false);
      }
      setPlaying(true);
    }
  }

  function restart() {
    handleRef.current?.stop();
    blackboardRef.current?.reset?.();
    setIdx(0);
    setDone(false);
    setPlaying(true);
  }

  const current = script?.scenes[idx];
  const board = current?.board_command;
  const formula =
    board?.action === 'write_formula' ? prettifyFormula(board.latex) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 3D scene window — supports inline fullscreen toggle. */}
      <div
        className={
          'relative overflow-hidden rounded-glass border border-white/10 bg-bg-deep transition-[height] duration-300 ' +
          (bigBoard ? 'h-[70vh] md:h-[78vh]' : 'h-[300px] md:h-[440px]')
        }
      >
        {use3d ? (
          <Scene3D
            ref={blackboardRef}
            avatarUrl={AVATAR_URL}
            avatarAction={avatarAction}
            audioEl={audio}
          />
        ) : (
          <AnimatedTeacher />
        )}
        {playing && (
          <div className="absolute right-3 top-14 z-10 flex items-center gap-2 rounded-full border border-aurora-1/40 bg-aurora-1/10 px-2.5 py-1 text-[11px] text-aurora-1 backdrop-blur md:top-3">
            <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-1" />
            говорит
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-bg-deep/70 px-2 py-1 text-[11px] text-text-muted backdrop-blur">
            <button
              onClick={() => setUse3d((v) => !v)}
              className="rounded-full px-2 py-0.5 hover:bg-white/10 hover:text-text-primary"
              title="Переключить 2D / 3D"
              type="button"
            >
              {use3d ? '2D' : '3D'}
            </button>
            <span className="opacity-30">|</span>
            <button
              onClick={() => setBigBoard((b) => !b)}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/10 hover:text-text-primary"
              title={bigBoard ? 'Свернуть доску' : 'Развернуть доску'}
              type="button"
            >
              {bigBoard ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {bigBoard ? 'свернуть' : 'крупно'}
            </button>
          </div>
        </div>
      </div>

      {/* Subtitles + nice formula */}
      <div className="rounded-glass border border-white/10 bg-white/[0.03] p-4 text-sm md:text-base">
        {loading && (
          <div className="flex items-center gap-2 text-text-muted">
            <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-aurora-2" />
            Готовлю мини-урок по теме «{task.title}»…
          </div>
        )}
        {!loading && current && (
          <>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-text-muted">
              Сцена {idx + 1} / {script?.scenes.length}
            </div>
            <p className="text-text-primary">{sanitizeTts(current.tts)}</p>
            {formula && (
              <div className="mt-4">
                <div className="relative overflow-hidden rounded-2xl border border-aurora-2/40 bg-gradient-to-br from-aurora-2/15 via-aurora-1/10 to-aurora-3/15 p-[1px] shadow-[0_8px_30px_-8px_rgba(122,231,199,0.35)]">
                  <div className="rounded-2xl bg-bg-elevated/80 px-5 py-4 backdrop-blur-sm">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-aurora-2/80">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-aurora-2 shadow-[0_0_8px_rgba(122,231,199,0.8)]" />
                      Формула
                    </div>
                    <div className="overflow-x-auto text-center font-mono text-lg leading-relaxed text-text-primary md:text-2xl">
                      <span className="bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">
                        {formula}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {board?.action === 'write_text' && (
              <div className="mt-3 rounded-lg border border-white/10 bg-bg-deep/60 p-2 font-mono text-sm text-aurora-2">
                {board.text}
              </div>
            )}
          </>
        )}
        {!loading && !script && (
          <div className="text-text-muted">
            Не удалось загрузить теорию. Попробуй ещё раз.
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <GlassButton variant="primary" size="md" onClick={toggle} disabled={!script}>
          {playing ? (
            <>
              <Pause size={16} strokeWidth={1.5} /> Пауза
            </>
          ) : done ? (
            <>
              <RotateCcw size={16} strokeWidth={1.5} /> Заново
            </>
          ) : (
            <>
              <Play size={16} strokeWidth={1.5} /> Слушать
            </>
          )}
        </GlassButton>

        {!playing && idx > 0 && !done && (
          <GlassButton variant="ghost" size="sm" onClick={restart}>
            <RotateCcw size={14} strokeWidth={1.5} /> Сначала
          </GlassButton>
        )}

        <div className="ml-auto">
          <GlassButton variant="gold" size="md" onClick={onWatched} disabled={!script}>
            <CheckCircle2 size={16} strokeWidth={1.5} /> Просмотрено
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
