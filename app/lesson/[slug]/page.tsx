'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Scene3D } from '@/components/Scene3D';
import { TopHUD, BottomHUD } from '@/components/HUD';
import { AskPanel } from '@/components/AskPanel';
import { DrawOverlay } from '@/components/DrawOverlay';
import { ColdCall } from '@/components/ColdCall';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { BlackboardHandle } from '@/components/Blackboard';
import { SceneRunner } from '@/lib/scene-queue';
import { useLessonStore } from '@/lib/store';
import type { AvatarAction, BoardCommand, LessonScene, LessonScript } from '@/lib/types';
import { exportLessonPdf } from '@/lib/pdf-export';
import { Share2 } from 'lucide-react';
import { VsaLogo } from '@/components/VsaLogo';

const AVATAR_URL =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR ?? 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

interface StartResponse {
  lesson: { id: string; slug: string; title: string; durationSec: number };
  script: LessonScript;
}

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const blackboardRef = useRef<BlackboardHandle>(null);
  const runnerRef = useRef<SceneRunner | null>(null);
  const [data, setData] = useState<StartResponse | null>(null);
  const [scene, setScene] = useState<LessonScene | null>(null);
  const [avatarAction, setAvatarAction] = useState<AvatarAction>('idle');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [starry, setStarry] = useState(false);
  const [drawOpen, setDrawOpen] = useState<{ prompt: string } | null>(null);
  const [coldCall, setColdCall] = useState<{ task: string } | null>(null);
  const [askResume, setAskResume] = useState<null | (() => void)>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const setScript = useLessonStore((s) => s.setScript);
  const setPlaying = useLessonStore((s) => s.setPlaying);
  const setThinking = useLessonStore((s) => s.setThinking);
  const setSceneIndex = useLessonStore((s) => s.setSceneIndex);
  const pushBoard = useLessonStore((s) => s.pushBoard);
  const sceneIndex = useLessonStore((s) => s.sceneIndex);
  const isPlaying = useLessonStore((s) => s.isPlaying);
  const isThinking = useLessonStore((s) => s.isThinking);
  const showSubs = useLessonStore((s) => s.showSubtitles);
  const rate = useLessonStore((s) => s.rate);

  // Load lesson
  useEffect(() => {
    if (!slug) return;
    fetch('/api/lesson/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
      .then((r) => r.json())
      .then((d: StartResponse) => {
        setData(d);
        setScript(d.script);
      })
      .catch(() => undefined);
  }, [slug, setScript]);

  // Build runner
  useEffect(() => {
    if (!data || !blackboardRef.current) return;
    const runner = new SceneRunner(data.script, {
      getRate: () => useLessonStore.getState().rate,
      onSceneStart: (idx, sc) => {
        setSceneIndex(idx);
        setScene(sc);
        if (sc.interactive === 'draw') {
          runner.pause();
          setDrawOpen({ prompt: sc.tts });
        }
      },
      onAvatarAction: (a) => setAvatarAction(a as AvatarAction),
      onBoardCommand: (cmd) => {
        blackboardRef.current?.exec(cmd);
        pushBoard(cmd);
      },
      onSpeakStart: (_t, a) => {
        setAvatarAction('explain');
        setAudio(a ?? null);
      },
      onSpeakEnd: () => {
        setAvatarAction('idle');
        setAudio(null);
      },
      onSceneEnd: () => undefined,
      onComplete: () => {
        setPlaying(false);
        // Best-effort: record an attempt
        if (data) {
          fetch('/api/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId: data.lesson.id, score: 100 }),
          }).catch(() => undefined);
        }
      },
    });
    runnerRef.current = runner;
    setPlaying(true);
    runner.run(0);

    // Cold-call random scheduler (8–10 min)
    const ms = (8 + Math.random() * 2) * 60_000;
    const timer = setTimeout(() => {
      runner.pause();
      setColdCall({
        task: 'Реши: уравнение x² − 5x + 6 = 0. Корни?',
      });
    }, ms);

    return () => {
      runner.cancel();
      clearTimeout(timer);
    };
  }, [data, pushBoard, setPlaying, setSceneIndex]);

  // Controls
  const togglePlay = useCallback(() => {
    const r = runnerRef.current;
    if (!r) return;
    if (isPlaying) {
      r.pause();
      setPlaying(false);
    } else {
      r.resume();
      setPlaying(true);
    }
  }, [isPlaying, setPlaying]);

  const seek = useCallback(
    (delta: number) => {
      const r = runnerRef.current;
      if (!r || !data) return;
      const dur = data.script.scenes.map((s) => s.duration);
      let i = r.index;
      if (delta > 0) {
        let want = delta;
        while (want > 0 && i < dur.length - 1) {
          want -= dur[i];
          i++;
        }
      } else {
        let want = delta;
        while (want < 0 && i > 0) {
          i--;
          want += dur[i];
        }
      }
      r.cancel();
      recreateRunner(i);
    },
    [data],
  );

  function recreateRunner(startIdx: number) {
    if (!data) return;
    blackboardRef.current?.reset();
    // Re-execute board commands up to startIdx for context
    for (let i = 0; i < startIdx; i++) {
      const c = data.script.scenes[i].board_command;
      if (c) blackboardRef.current?.exec(c);
    }
    const runner = new SceneRunner(data.script, {
      getRate: () => useLessonStore.getState().rate,
      onSceneStart: (idx, sc) => {
        setSceneIndex(idx);
        setScene(sc);
      },
      onAvatarAction: (a) => setAvatarAction(a as AvatarAction),
      onBoardCommand: (cmd) => {
        blackboardRef.current?.exec(cmd);
        pushBoard(cmd);
      },
      onSpeakStart: (_t, a) => setAudio(a ?? null),
      onSpeakEnd: () => setAudio(null),
      onSceneEnd: () => undefined,
      onComplete: () => setPlaying(false),
    });
    runnerRef.current = runner;
    setPlaying(true);
    runner.run(startIdx);
  }

  const askQuestion = useCallback(
    async (question: string) => {
      const r = runnerRef.current;
      if (!r) return;
      r.pause();
      setPlaying(false);
      setAvatarAction('listen');
      setThinking(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: data?.lesson.id,
            question,
            history: [],
          }),
        });
        const ans = (await res.json()) as { answer: string; board_commands: BoardCommand[] };
        for (const c of ans.board_commands ?? []) {
          blackboardRef.current?.exec(c);
          pushBoard(c);
        }
        setAvatarAction('explain');
        const { clientSpeak } = await import('@/lib/tts');
        const h = await clientSpeak(ans.answer, { rate: useLessonStore.getState().rate });
        setAudio(h.audio ?? null);
        await h.ended;
        setAudio(null);
        setAvatarAction('idle');
        // Ask resume
        setAskResume(() => () => {
          r.resume();
          setPlaying(true);
        });
      } finally {
        setThinking(false);
      }
    },
    [data, pushBoard, setPlaying, setThinking],
  );

  const rephrase = useCallback(async () => {
    if (!scene) return;
    const r = runnerRef.current;
    r?.pause();
    setPlaying(false);
    setThinking(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Переформулируй то же самое другими словами проще, не меняя смысла, на русском, кратко: "${scene.tts}"`,
        }),
      });
      const ans = (await res.json()) as { answer: string };
      const { clientSpeak } = await import('@/lib/tts');
      setAvatarAction('explain');
      const h = await clientSpeak(ans.answer, { rate: useLessonStore.getState().rate });
      setAudio(h.audio ?? null);
      await h.ended;
      setAudio(null);
      setAvatarAction('idle');
      r?.resume();
      setPlaying(true);
    } finally {
      setThinking(false);
    }
  }, [scene, setPlaying, setThinking]);

  const screenshot = useCallback(() => {
    const c = blackboardRef.current?.getCanvas();
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${data?.lesson.title ?? 'board'}.png`;
    a.click();
  }, [data]);

  const pdf = useCallback(async () => {
    if (!data) return;
    await exportLessonPdf(data.script, blackboardRef.current?.getCanvas() ?? null);
  }, [data]);

  const share = useCallback(async () => {
    if (!data) return;
    const stateJson = blackboardRef.current?.getStateJson() ?? '[]';
    const res = await fetch('/api/lesson/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: data.lesson.id, stateJson, sceneIndex }),
    });
    const out = (await res.json()) as { uuid?: string };
    if (out.uuid) {
      const url = `${window.location.origin}/share/${out.uuid}`;
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      alert(`Ссылка скопирована:\n${url}`);
    }
  }, [data, sceneIndex]);

  const tryVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
    if (!xr) return alert('WebXR не поддерживается этим браузером.');
    const ok = await xr.isSessionSupported('immersive-vr').catch(() => false);
    alert(ok ? 'VR доступен. Подключите шлем и запустите ещё раз.' : 'VR-шлем не обнаружен.');
  }, []);

  const totalSec = useMemo(() => data?.script.duration_sec ?? 0, [data]);
  const currentSec = useMemo(() => {
    if (!data) return 0;
    let t = 0;
    for (let i = 0; i < sceneIndex; i++) t += data.script.scenes[i].duration;
    return t;
  }, [data, sceneIndex]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {data && (
        <TopHUD title={data.lesson.title} total={totalSec} current={currentSec} />
      )}

      {/* Scene */}
      <div className="absolute inset-0">
        <Scene3D
          ref={blackboardRef}
          avatarUrl={AVATAR_URL}
          avatarAction={avatarAction}
          audioEl={audio}
          starry={starry}
        />
      </div>

      {/* Subtitles */}
      {showSubs && scene && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-6">
          <GlassPanel className="max-w-3xl text-center" padding="md">
            <p className="text-base text-text-primary">{scene.tts}</p>
          </GlassPanel>
        </div>
      )}

      {/* Right side: Ask + share + back-to-cabinet */}
      <div className="absolute right-3 top-20 z-20 flex flex-col gap-2 sm:right-4 sm:top-24 sm:gap-3">
        <AskPanel thinking={isThinking} onAsk={askQuestion} />
        <GlassButton size="sm" variant="ghost" onClick={share}>
          <Share2 size={16} strokeWidth={1.5} /> Поделиться
        </GlassButton>
        <button
          onClick={() => router.push('/app')}
          className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-bg-deep/70 px-3 py-1.5 text-xs text-text-muted backdrop-blur transition hover:border-aurora-2/40 hover:text-text-primary"
          type="button"
        >
          <VsaLogo size={14} withGlow={false} />
          <span>Кабинет</span>
        </button>
      </div>

      {/* Resume prompt after Q&A */}
      {askResume && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <GlassPanel className="pointer-events-auto flex items-center gap-3" padding="md">
            <span className="text-text-primary">Возвращаемся к лекции?</span>
            <GlassButton
              size="sm"
              variant="gold"
              onClick={() => {
                askResume();
                setAskResume(null);
              }}
            >
              Да
            </GlassButton>
            <GlassButton size="sm" variant="ghost" onClick={() => setAskResume(null)}>
              Нет
            </GlassButton>
          </GlassPanel>
        </div>
      )}

      {feedback && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <GlassPanel className="pointer-events-auto max-w-md" padding="md">
            <div className="text-sm text-text-primary">{feedback}</div>
            <button
              className="mt-2 text-xs text-text-muted hover:text-text-primary"
              onClick={() => setFeedback(null)}
            >
              ок
            </button>
          </GlassPanel>
        </div>
      )}

      {/* Cold-call modal */}
      {coldCall && (
        <ColdCall
          studentName="Костя"
          task={coldCall.task}
          onAnswer={(ans) => {
            setColdCall(null);
            void askQuestion(`Я ответил: ${ans}. Проверь, пожалуйста.`);
          }}
          onSkip={() => {
            setColdCall(null);
            runnerRef.current?.resume();
            setPlaying(true);
          }}
        />
      )}

      {/* Draw overlay */}
      {drawOpen && (
        <DrawOverlay
          prompt={drawOpen.prompt}
          onFeedback={(fb) => {
            setDrawOpen(null);
            setFeedback(fb);
            runnerRef.current?.resume();
            setPlaying(true);
          }}
          onClose={() => {
            setDrawOpen(null);
            runnerRef.current?.resume();
            setPlaying(true);
          }}
        />
      )}

      <BottomHUD
        onSeek={seek}
        onTogglePlay={togglePlay}
        onScreenshot={screenshot}
        onPdf={pdf}
        onRephrase={rephrase}
        onToggleStarry={() => setStarry((s) => !s)}
        onVR={tryVR}
        starry={starry}
      />

      {/* avoid unused */}
      <span className="hidden">{rate}</span>
    </div>
  );
}
