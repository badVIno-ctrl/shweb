'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Camera,
  FileDown,
  Captions,
  RotateCcw,
  Glasses,
  Moon,
  Home,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { useLessonStore } from '@/lib/store';
import { cn, formatTime } from '@/lib/utils';

const RATES = [0.25, 0.5, 1, 1.5, 2, 3];

interface TopHudProps {
  title: string;
  total: number;
  current: number;
}
export function TopHUD({ title, total, current }: TopHudProps) {
  const pct = Math.min(100, (current / Math.max(1, total)) * 100);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-4">
      <GlassPanel
        className="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center gap-3 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3"
        padding="none"
      >
        <Link
          href="/"
          aria-label="На главную"
          title="На главную"
          className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-text-muted transition hover:border-aurora-2/50 hover:text-text-primary"
        >
          <ArrowLeft
            size={14}
            strokeWidth={2}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          <Home size={14} strokeWidth={2} className="text-aurora-2" />
          <span className="hidden sm:inline">На главную</span>
        </Link>
        <div className="min-w-0 flex-1 truncate font-display text-base font-semibold text-text-primary sm:text-lg">
          {title}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="font-mono text-[11px] text-text-muted sm:text-xs">
            {formatTime(current)} / {formatTime(total)}
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06] sm:w-48">
            <div
              className="h-full rounded-full bg-aurora-2 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

interface BottomHudProps {
  onSeek: (deltaSec: number) => void;
  onTogglePlay: () => void;
  onScreenshot: () => void;
  onPdf: () => void;
  onRephrase: () => void;
  onToggleStarry: () => void;
  onVR?: () => void;
  starry: boolean;
}

export function BottomHUD({
  onSeek,
  onTogglePlay,
  onScreenshot,
  onPdf,
  onRephrase,
  onToggleStarry,
  onVR,
  starry,
}: BottomHudProps) {
  const isPlaying = useLessonStore((s) => s.isPlaying);
  const rate = useLessonStore((s) => s.rate);
  const setRate = useLessonStore((s) => s.setRate);
  const showSubs = useLessonStore((s) => s.showSubtitles);
  const toggleSubs = useLessonStore((s) => s.toggleSubtitles);
  const [showRates, setShowRates] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
      <GlassPanel className="pointer-events-auto flex flex-wrap items-center gap-2 px-3 py-2" padding="none">
        <GlassButton size="sm" variant="ghost" onClick={() => onSeek(-10)} title="Назад 10 сек">
          <ChevronLeft size={18} strokeWidth={1.5} />
          10
        </GlassButton>
        <GlassButton size="sm" onClick={onTogglePlay} title={isPlaying ? 'Пауза' : 'Играть'}>
          {isPlaying ? <Pause size={18} strokeWidth={1.5} /> : <Play size={18} strokeWidth={1.5} />}
        </GlassButton>
        <GlassButton size="sm" variant="ghost" onClick={() => onSeek(10)} title="Вперёд 10 сек">
          10
          <ChevronRight size={18} strokeWidth={1.5} />
        </GlassButton>

        <div className="relative">
          <GlassButton size="sm" variant="ghost" onClick={() => setShowRates((v) => !v)}>
            {rate}×
          </GlassButton>
          {showRates && (
            <GlassPanel
              padding="none"
              className="absolute bottom-full left-0 mb-2 flex flex-col p-1"
            >
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRate(r);
                    setShowRates(false);
                  }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                    r === rate ? 'bg-white/10 text-text-primary' : 'text-text-muted hover:bg-white/5',
                  )}
                >
                  {r}×
                </button>
              ))}
            </GlassPanel>
          )}
        </div>

        <GlassButton
          size="sm"
          variant="ghost"
          onClick={toggleSubs}
          title={showSubs ? 'Скрыть субтитры' : 'Показать субтитры'}
          className={cn(showSubs && 'text-aurora-1')}
        >
          <Captions size={18} strokeWidth={1.5} />
        </GlassButton>

        <GlassButton size="sm" variant="ghost" onClick={onRephrase} title="Повторить другими словами">
          <RotateCcw size={18} strokeWidth={1.5} />
        </GlassButton>

        <GlassButton size="sm" variant="ghost" onClick={onScreenshot} title="Скриншот">
          <Camera size={18} strokeWidth={1.5} />
        </GlassButton>

        <GlassButton size="sm" variant="ghost" onClick={onPdf} title="Скачать конспект">
          <FileDown size={18} strokeWidth={1.5} />
        </GlassButton>

        <GlassButton
          size="sm"
          variant="ghost"
          onClick={onToggleStarry}
          title="Класс под звёздами"
          className={cn(starry && 'text-aurora-2')}
        >
          <Moon size={18} strokeWidth={1.5} />
        </GlassButton>

        {onVR && (
          <GlassButton size="sm" variant="gold" onClick={onVR} title="VR">
            <Glasses size={18} strokeWidth={1.5} />
            VR
          </GlassButton>
        )}
      </GlassPanel>
    </div>
  );
}
