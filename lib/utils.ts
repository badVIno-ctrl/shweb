import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ё]/g, 'e')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export async function sha256Hex(text: string): Promise<string> {
  // Web Crypto is available in the browser and in modern Node (globalThis.crypto).
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (subtle) {
    const enc = new TextEncoder().encode(text);
    const buf = await subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Tiny non-crypto fallback (good enough for cache keys).
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.floor(sec % 60));
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Strip LaTeX/math markup from a TTS string so the synthesizer reads natural
 * Russian instead of "бэкслэш фрак скобка". Falls back to verbal forms.
 */
export function sanitizeTts(input: string): string {
  let s = input;
  // Remove math delimiters but keep their content
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, ' $1 ').replace(/\$([^$]+)\$/g, ' $1 ');
  // Common LaTeX commands to verbal Russian
  s = s
    .replace(/\\tfrac\{([^}]+)\}\{([^}]+)\}/g, ' $1 делить на $2 ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' $1 делить на $2 ')
    .replace(/\\sqrt\{([^}]+)\}/g, ' корень из $1 ')
    .replace(/\\sqrt/g, ' корень ')
    .replace(/\\cdot/g, ' умножить на ')
    .replace(/\\times/g, ' умножить на ')
    .replace(/\\pi\b/g, ' пи ')
    .replace(/\\triangle/g, ' треугольник ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\,|\\;|\\:|\\!/g, ' ')
    .replace(/\\quad|\\qquad/g, ', ')
    .replace(/\\[a-zA-Z]+/g, ' ');
  // Superscripts / subscripts: x^2 -> x в квадрате; a_n -> а эн
  s = s.replace(/([A-Za-zА-Яа-я0-9\)])\^2\b/g, '$1 в квадрате');
  s = s.replace(/([A-Za-zА-Яа-я0-9\)])\^3\b/g, '$1 в кубе');
  s = s.replace(/([A-Za-zА-Яа-я0-9\)])\^\{?([0-9n]+)\}?/g, '$1 в степени $2');
  s = s.replace(/_\{?([A-Za-zА-Яа-я0-9]+)\}?/g, ' $1');
  // Drop curly braces left after replacements
  s = s.replace(/[{}]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
