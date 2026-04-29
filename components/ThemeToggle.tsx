'use client';

import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { GlassButton } from './GlassButton';

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <GlassButton
      size="sm"
      variant="ghost"
      onClick={() => setTheme(next)}
      title="Переключить тему"
    >
      {theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </GlassButton>
  );
}
