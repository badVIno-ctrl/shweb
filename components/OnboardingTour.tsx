'use client';

/**
 * OnboardingTour — 3-step first-run tour for the cabinet.
 *
 * Shows sequential callouts pinned to the edges of the viewport (no heavy
 * positioning engine). Each callout highlights a main feature area, with a
 * short headline + explanation + "Next / Skip" controls.
 *
 * The tour is gated by `localStorage['vsa_tour_done']` so returning users
 * aren't re-interrupted. Fully responsive — on phones, callouts sit near the
 * bottom with safe-area padding.
 */

import { useEffect, useState } from 'react';
import { Sparkles, GraduationCap, Dumbbell, Settings } from 'lucide-react';

const STORAGE_KEY = 'vsa_tour_done';

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  anchor: 'tl' | 'tr' | 'bl' | 'br';
}

const STEPS: Step[] = [
  {
    icon: <GraduationCap size={18} strokeWidth={1.5} />,
    title: 'Здесь живёт ваш 3D-учитель Viora AI',
    body: 'На каждое задание есть мини-урок: Viora рассказывает теорию и пишет формулы на доске.',
    anchor: 'tl',
  },
  {
    icon: <Sparkles size={18} strokeWidth={1.5} />,
    title: 'А здесь — умная доска',
    body: 'Фломастер, фигуры, Shift для прямых линий, Ctrl/⌘+Z для отмены. Можно развернуть на весь экран.',
    anchor: 'bl',
  },
  {
    icon: <Dumbbell size={18} strokeWidth={1.5} />,
    title: 'Бесконечная практика',
    body: 'После теории Viora AI сгенерирует свежую задачу, даст подсказки и проверит ответ.',
    anchor: 'br',
  },
  {
    icon: <Settings size={18} strokeWidth={1.5} />,
    title: 'Профиль и настройки',
    body: 'Аватар, прогресс по 19 заданиям, тёмная тема и экспорт конспекта — всё в одном месте.',
    anchor: 'tr',
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    // Let the cabinet paint before showing the first callout.
    const t = window.setTimeout(() => setStep(0), 900);
    return () => window.clearTimeout(t);
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setStep(null);
  }

  function next() {
    setStep((s) => {
      if (s === null) return null;
      if (s + 1 >= STEPS.length) {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
        return null;
      }
      return s + 1;
    });
  }

  if (step === null) return null;
  const s = STEPS[step];

  const anchorCls: Record<Step['anchor'], string> = {
    tl: 'left-3 top-20 sm:left-6 sm:top-24',
    tr: 'right-3 top-20 sm:right-6 sm:top-24',
    bl: 'bottom-6 left-3 sm:bottom-10 sm:left-6',
    br: 'bottom-6 right-3 sm:bottom-10 sm:right-6',
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {/* Subtle darken so the callout pops without blocking the cabinet. */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
      <div
        className={
          'pointer-events-auto absolute max-w-[calc(100vw-1.5rem)] sm:max-w-sm ' +
          anchorCls[s.anchor]
        }
      >
        <div className="relative rounded-2xl border border-aurora-2/30 bg-bg-elevated/95 p-4 shadow-[0_20px_60px_-20px_rgba(122,231,199,0.45)] backdrop-blur-glass">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-aurora-2/40 bg-aurora-2/10 text-aurora-2">
              {s.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
                Шаг {step + 1} из {STEPS.length}
              </div>
              <div className="mt-1 font-display text-base font-semibold text-text-primary">
                {s.title}
              </div>
              <p className="mt-1 text-sm text-text-muted">{s.body}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              Пропустить
            </button>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1.5 w-1.5 rounded-full transition-all ' +
                    (i === step
                      ? 'w-6 bg-aurora-2'
                      : i < step
                      ? 'bg-aurora-2/50'
                      : 'bg-white/20')
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-full border border-aurora-2/50 bg-aurora-2/15 px-3 py-1.5 text-xs font-medium text-aurora-2 transition-transform hover:bg-aurora-2/25 active:scale-[0.97]"
            >
              {step + 1 >= STEPS.length ? 'Готово' : 'Дальше'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
