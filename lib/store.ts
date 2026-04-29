'use client';

import { create } from 'zustand';
import type { BoardCommand, LessonScript } from './types';

export type Theme = 'dark' | 'light' | 'starry';

interface UIState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  },
}));

interface LessonState {
  script: LessonScript | null;
  sceneIndex: number;
  isPlaying: boolean;
  isThinking: boolean;
  rate: number; // 0.25..3
  showSubtitles: boolean;
  boardHistory: BoardCommand[]; // executed commands for snapshot/PDF
  setScript: (s: LessonScript | null) => void;
  setSceneIndex: (i: number) => void;
  setPlaying: (v: boolean) => void;
  setThinking: (v: boolean) => void;
  setRate: (r: number) => void;
  toggleSubtitles: () => void;
  pushBoard: (cmd: BoardCommand) => void;
  resetBoard: () => void;
}

export const useLessonStore = create<LessonState>((set) => ({
  script: null,
  sceneIndex: 0,
  isPlaying: false,
  isThinking: false,
  rate: 1,
  showSubtitles: true,
  boardHistory: [],
  setScript: (script) => set({ script, sceneIndex: 0, boardHistory: [] }),
  setSceneIndex: (sceneIndex) => set({ sceneIndex }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setThinking: (isThinking) => set({ isThinking }),
  setRate: (rate) => set({ rate }),
  toggleSubtitles: () => set((s) => ({ showSubtitles: !s.showSubtitles })),
  pushBoard: (cmd) => set((s) => ({ boardHistory: [...s.boardHistory, cmd] })),
  resetBoard: () => set({ boardHistory: [] }),
}));
