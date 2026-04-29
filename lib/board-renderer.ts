// Renders board commands onto a 2D canvas (used as a Three.js CanvasTexture)
// plus a small math expression evaluator for graphs.

import type { BoardCommand, BoardRegion } from './types';

const CHALK = '#E8ECF5';
const CHALK_2 = '#7AE7C7';
const CHALK_3 = '#A78BFA';
const CHALK_4 = '#FF8FB1';
const HIGHLIGHT = 'rgba(245, 208, 97, 0.18)';

export interface BoardCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** vertical write cursor for the LEFT figure column */
  writeY: number;
  /** vertical write cursor for the RIGHT formula column */
  writeYRight: number;
}

export function createBoardCanvas(width = 1600, height = 1000): BoardCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  // Initial board fill
  ctx.fillStyle = '#0c1322';
  ctx.fillRect(0, 0, width, height);
  drawSubtleGrid(ctx, width, height);
  return { canvas, ctx, writeY: 0, writeYRight: 0 };
}

export function resetBoard(c: BoardCanvas): void {
  c.ctx.fillStyle = '#0c1322';
  c.ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
  drawSubtleGrid(c.ctx, c.canvas.width, c.canvas.height);
  c.writeY = 0;
  c.writeYRight = 0;
}

function drawSubtleGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const step = 50;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Default left-column region (figures: triangle / circle / graph / 3d-solid). */
const LEFT_REGION: BoardRegion = { x: 0.05, y: 0.10, w: 0.40, h: 0.80 };
/** Default right-column region (text + LaTeX-style formulas). */
const RIGHT_REGION: BoardRegion = { x: 0.50, y: 0.10, w: 0.45, h: 0.80 };

function regionPx(
  c: BoardCanvas,
  r?: BoardRegion,
  fallback: BoardRegion = { x: 0.08, y: 0.1, w: 0.84, h: 0.8 },
): { x: number; y: number; w: number; h: number } {
  const W = c.canvas.width;
  const H = c.canvas.height;
  const src = r ?? fallback;
  return { x: src.x * W, y: src.y * H, w: src.w * W, h: src.h * H };
}

const SUPER_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
  'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
  't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
};
const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

function toSuperscript(s: string): string {
  let out = '';
  for (const ch of s) out += SUPER_MAP[ch] ?? SUPER_MAP[ch.toLowerCase()] ?? ch;
  return out;
}
function toSubscript(s: string): string {
  let out = '';
  for (const ch of s) out += SUB_MAP[ch] ?? SUB_MAP[ch.toLowerCase()] ?? ch;
  return out;
}

/** Convert LaTeX-ish source into a chalk-friendly unicode string. Renders
 *  super/sub scripts, √, fractions, Greek letters — without leaving raw
 *  control sequences (`^`, `\sqrt{}`, `\displaystyle` etc.) on the board. */
export function prettifyFormula(src: string): string {
  let s = src;
  // Strip mode controls that don't affect plain-text rendering.
  s = s
    .replace(/\\displaystyle\b/g, '')
    .replace(/\\quad\b/g, '   ')
    .replace(/\\,/g, ' ')
    .replace(/\\!|\\;|\\:/g, '')
    .replace(/\\left|\\right/g, '');
  // Iterate: collapse innermost super/sub first (no braces), then frac/sqrt
  // (which require leaf-level group content), then repeat — handles nesting
  // like \sqrt{3^{2}+4^{2}} or \frac{x^{2}+1}{2}.
  for (let pass = 0; pass < 6; pass++) {
    const before = s;
    s = s
      .replace(/\^\{([^{}]+)\}/g, (_m, g) => toSuperscript(g))
      .replace(/\^(-?\w)/g, (_m, g) => toSuperscript(g))
      .replace(/\*\*(-?\w+)/g, (_m, g) => toSuperscript(g))
      .replace(/_\{([^{}]+)\}/g, (_m, g) => toSubscript(g))
      .replace(/_([A-Za-zА-Яа-я0-9])/g, (_m, g) => toSubscript(g))
      .replace(/\\tfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)⁄($2)')
      .replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)⁄($2)')
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)⁄($2)')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
      .replace(/\\sqrt\s+(\w+)/g, '√($1)')
      .replace(/\\sqrt\b/g, '√');
    if (s === before) break;
  }
  // sqrt(...) without backslash.
  s = s.replace(/sqrt\(([^()]+)\)/gi, '√($1)');
  // Operators / Greek / functions.
  s = s
    .replace(/\\cdot\b/g, '·')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\le(?![a-z])/g, '≤')
    .replace(/\\ge(?![a-z])/g, '≥')
    .replace(/\\ne(?![a-z])/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\to\b/g, '→')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\text\s*\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\s*\{([^}]+)\}/g, '$1')
    .replace(/\\triangle\b/g, '△')
    .replace(/\\angle\b/g, '∠')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\phi\b/g, 'φ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\ctg\b/g, 'ctg')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sum\b/g, 'Σ')
    .replace(/\\int\b/g, '∫')
    .replace(/\\\(|\\\)/g, '')
    .replace(/\\\[|\\\]/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, '  ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

// --- expression evaluator (very small subset: + - * / ^, sin, cos, tan, exp, ln, sqrt, abs, x) ---

export function evalExpr(expr: string, x: number): number {
  // Convert ^ to ** then sandbox via Function. We restrict allowed identifiers.
  const safe = expr
    .replace(/\^/g, '**')
    .replace(/\bln\(/g, 'Math.log(')
    .replace(/\b(sin|cos|tan|exp|sqrt|abs|log)\(/g, 'Math.$1(')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E');
  // basic char whitelist
  if (!/^[-+*/().,\d\sxXMath.PIElogsincaqrtbexp]+$/.test(safe)) {
    return NaN;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('x', `return (${safe});`) as (x: number) => number;
    const v = fn(x);
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

// --- Board renderer ---

export function renderBoardCommand(c: BoardCanvas, cmd: BoardCommand): void {
  const { ctx } = c;
  ctx.save();
  switch (cmd.action) {
    case 'erase': {
      const r = regionPx(c, cmd.region);
      ctx.fillStyle = '#0c1322';
      ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      drawSubtleGrid(ctx, c.canvas.width, c.canvas.height);
      // If full erase, reset both write cursors as well.
      if (!cmd.region) {
        c.writeY = 0;
        c.writeYRight = 0;
      }
      break;
    }
    case 'highlight': {
      const r = regionPx(c, cmd.region);
      ctx.fillStyle = HIGHLIGHT;
      roundRect(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fill();
      break;
    }
    case 'write_text': {
      ctx.fillStyle = CHALK;
      ctx.font = '600 52px Inter, sans-serif';
      if (cmd.region) {
        const r = regionPx(c, cmd.region);
        wrapText(ctx, cmd.text, r.x, r.y + 56, r.w, 60);
      } else {
        const r = regionPx(c, undefined, RIGHT_REGION);
        const lineH = 70;
        const startY = r.y + Math.max(48, c.writeYRight + lineH * 0.5);
        const lines = wrapText(ctx, cmd.text, r.x, startY, r.w, lineH);
        c.writeYRight = startY - r.y + lines * lineH;
      }
      break;
    }
    case 'write_formula': {
      // Pretty-printed LaTeX. We avoid raw '^' / '**' / '\\sqrt' — see prettifyFormula().
      const pretty = prettifyFormula(cmd.latex);
      const fontPx = 64;
      ctx.font = `500 ${fontPx}px "JetBrains Mono", "JetBrains Mono Nerd Font", monospace`;
      // Layout in a beautiful boxed card with a soft glow (similar to textbook style).
      const r = regionPx(c, cmd.region, RIGHT_REGION);
      const padX = 28;
      const padY = 22;
      const startY = cmd.region
        ? r.y + 60
        : r.y + Math.max(60, c.writeYRight + 40);
      const measured = ctx.measureText(pretty);
      const textW = Math.min(measured.width, r.w - padX * 2);
      const cardW = Math.min(r.w, textW + padX * 2);
      const cardH = fontPx + padY * 2;
      const cardX = r.x;
      const cardY = startY - fontPx + 8;

      // soft glow
      ctx.save();
      ctx.shadowColor = 'rgba(122, 231, 199, 0.35)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = 'rgba(122, 231, 199, 0.05)';
      roundRect(ctx, cardX, cardY, cardW, cardH, 18);
      ctx.fill();
      ctx.restore();
      // border
      ctx.strokeStyle = 'rgba(167,139,250,0.35)';
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 18);
      ctx.stroke();
      // formula text
      ctx.fillStyle = CHALK_2;
      ctx.fillText(pretty, cardX + padX, cardY + padY + fontPx * 0.78);

      if (!cmd.region) {
        c.writeYRight = cardY + cardH - r.y + 22;
      }
      break;
    }
    case 'draw_triangle': {
      const r = regionPx(c, cmd.region, LEFT_REGION);
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      const A = { x: r.x, y: r.y + r.h };
      const B = { x: r.x + r.w, y: r.y + r.h };
      const C0 = cmd.kind === 'right' ? { x: r.x, y: r.y } : { x: r.x + r.w / 2, y: r.y };
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C0.x, C0.y);
      ctx.closePath();
      ctx.stroke();
      if (cmd.kind === 'right') {
        ctx.strokeRect(A.x + 2, A.y - 30, 28, 28);
      }
      const labels = cmd.labels ?? ['a', 'b', 'c'];
      ctx.fillStyle = CHALK_3;
      ctx.font = '500 48px "JetBrains Mono", monospace';
      ctx.fillText(labels[0], (A.x + C0.x) / 2 - 40, (A.y + C0.y) / 2);
      ctx.fillText(labels[1], (A.x + B.x) / 2, A.y + 60);
      ctx.fillText(labels[2], (B.x + C0.x) / 2 + 10, (B.y + C0.y) / 2);
      break;
    }
    case 'draw_circle': {
      const r = regionPx(c, cmd.region, LEFT_REGION);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const rad = Math.min(r.w, r.h) / 2 - 8;
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = CHALK_4;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      if (cmd.labels?.[0]) {
        ctx.fillStyle = CHALK_3;
        ctx.font = '500 40px "JetBrains Mono", monospace';
        ctx.fillText(cmd.labels[0], cx + 10, cy - 10);
      }
      break;
    }
    case 'draw_function_graph': {
      const r = regionPx(c, cmd.region, LEFT_REGION);
      const [xMin, xMax] = cmd.xRange ?? [-10, 10];
      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h / 2);
      ctx.lineTo(r.x + r.w, r.y + r.h / 2);
      ctx.moveTo(r.x + r.w / 2, r.y);
      ctx.lineTo(r.x + r.w / 2, r.y + r.h);
      ctx.stroke();

      // sample
      const samples = 400;
      const ys: number[] = [];
      for (let i = 0; i <= samples; i++) {
        const xv = xMin + ((xMax - xMin) * i) / samples;
        ys.push(evalExpr(cmd.expr, xv));
      }
      const finite = ys.filter((v) => Number.isFinite(v));
      const yMin = cmd.yRange?.[0] ?? Math.min(...finite, -1);
      const yMax = cmd.yRange?.[1] ?? Math.max(...finite, 1);
      const sx = (xv: number) => r.x + ((xv - xMin) / (xMax - xMin)) * r.w;
      const sy = (yv: number) => r.y + r.h - ((yv - yMin) / (yMax - yMin)) * r.h;

      ctx.strokeStyle = CHALK_2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= samples; i++) {
        const xv = xMin + ((xMax - xMin) * i) / samples;
        const yv = ys[i];
        if (!Number.isFinite(yv)) {
          started = false;
          continue;
        }
        const px = sx(xv);
        const py = sy(yv);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      ctx.fillStyle = CHALK_3;
      ctx.font = '500 32px "JetBrains Mono", monospace';
      ctx.fillText(`y = ${cmd.expr}`, r.x + 16, r.y + 36);
      break;
    }
    case 'draw_3d_solid': {
      // The board is 2D; the 3D solid is rendered by Scene3D in a separate mesh.
      // Here we leave a placeholder note on the board.
      const r = regionPx(c, undefined);
      ctx.fillStyle = CHALK_3;
      ctx.font = '600 44px Inter, sans-serif';
      ctx.fillText(`▸ 3D-фигура: ${cmd.shape}`, r.x, r.y + 60);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 28px Inter, sans-serif';
      ctx.fillText('(вращайте мышью)', r.x, r.y + 100);
      break;
    }
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  let count = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
      count++;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, yy);
    count++;
  }
  return count;
}
