'use client';

/**
 * SplashIntro — premium landing intro animation.
 *
 *   Stage 1 (0 → ~1.2s):   "V S A" fade up with glow.
 *   Stage 2 (~1.2 → 2.4s): "S" fades, "V" and "A" spread outward; the full
 *                          title "Viora Smart Academy" reveals between them.
 *   Stage 3 (~2.4 → 3.0s): Whole splash scales up and fades out.
 *
 * Uses a single global <style> element (not styled-jsx) so keyframes are not
 * scoped/renamed. A hard-safety timeout guarantees dismissal even if a single
 * animation fails. Clicking/tapping the splash also dismisses it.
 *
 * Honors prefers-reduced-motion — collapses to a 150ms fade.
 * Scales via `clamp()` so it looks right on 360px phones → 4K displays.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vsa_splash_shown';
const CSS_ID = 'vsa-splash-css';

const CSS = `
.vsa-splash {
  position: fixed; inset: 0; z-index: 100;
  display: grid; place-items: center;
  overflow: hidden;
  background: #0A0E1A;
  cursor: pointer;
  animation: vsa-splash-fade-in 220ms ease-out;
}
.vsa-splash-leave { animation: vsa-splash-out 520ms cubic-bezier(0.7, 0, 0.84, 0) forwards; }
.vsa-splash-aurora {
  position: absolute; left: 50%; top: 50%;
  width: 60vmin; height: 60vmin;
  border-radius: 9999px;
  background: rgba(122, 231, 199, 0.22);
  filter: blur(80px);
  transform: translate(-50%, -50%);
  animation: vsa-splash-pulse 3.6s ease-in-out infinite;
}
.vsa-splash-aurora.b {
  width: 44vmin; height: 44vmin;
  left: 38%; top: 40%;
  background: rgba(167, 139, 250, 0.2);
  animation-duration: 4.4s;
  animation-delay: 400ms;
}
.vsa-splash-mark {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display, 'Inter'), system-ui, sans-serif;
  font-weight: 600;
  line-height: 1;
}
.vsa-letter {
  display: inline-block;
  font-size: clamp(56px, 20vmin, 180px);
  color: #f4f0ff;
  text-shadow:
    0 0 18px rgba(167, 139, 250, 0.55),
    0 0 42px rgba(122, 231, 199, 0.28);
  opacity: 0;
  transform: translateY(18px) scale(0.96);
  filter: blur(8px);
}
.vsa-gap { display: inline-block; width: clamp(12px, 3vmin, 40px); }

.vsa-letter.v {
  animation:
    vsa-letter-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 120ms forwards,
    vsa-spread-left 900ms cubic-bezier(0.76, 0, 0.24, 1) 1300ms forwards;
}
.vsa-letter.s {
  animation:
    vsa-letter-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 260ms forwards,
    vsa-letter-out 620ms cubic-bezier(0.76, 0, 0.24, 1) 1300ms forwards;
}
.vsa-letter.a {
  animation:
    vsa-letter-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards,
    vsa-spread-right 900ms cubic-bezier(0.76, 0, 0.24, 1) 1300ms forwards;
}

.vsa-full {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  gap: clamp(8px, 1.6vmin, 20px);
  font-size: clamp(22px, 6.2vmin, 56px);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #f4f0ff;
  text-shadow:
    0 0 14px rgba(167, 139, 250, 0.55),
    0 0 36px rgba(122, 231, 199, 0.28);
  pointer-events: none;
}
.vsa-full span {
  opacity: 0; transform: translateY(12px);
  animation: vsa-word-in 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.vsa-full .w2 { color: #7ae7c7; }
.vsa-full span:nth-child(1) { animation-delay: 1500ms; }
.vsa-full span:nth-child(2) { animation-delay: 1650ms; }
.vsa-full span:nth-child(3) { animation-delay: 1800ms; }

.vsa-tagline {
  position: absolute; left: 50%; bottom: 14vh;
  transform: translateX(-50%);
  font-size: clamp(10px, 1.6vmin, 13px);
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  opacity: 0;
  animation: vsa-fade-in 600ms ease-out 2000ms forwards;
  white-space: nowrap;
}

@keyframes vsa-splash-fade-in {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes vsa-letter-in {
  0%   { opacity: 0; transform: translateY(18px) scale(0.96); filter: blur(8px); }
  60%  { filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes vsa-spread-left {
  0%   { transform: translateX(0) translateY(0) scale(1); }
  100% { transform: translateX(calc(-1 * clamp(70px, 22vmin, 260px))) scale(1); opacity: 1; }
}
@keyframes vsa-spread-right {
  0%   { transform: translateX(0) translateY(0) scale(1); }
  100% { transform: translateX(clamp(70px, 22vmin, 260px)) scale(1); opacity: 1; }
}
@keyframes vsa-letter-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-6px) scale(0.9); }
}
@keyframes vsa-word-in {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes vsa-fade-in {
  to { opacity: 1; }
}
@keyframes vsa-splash-out {
  0%   { opacity: 1; transform: scale(1); filter: blur(0); }
  100% { opacity: 0; transform: scale(1.05); filter: blur(6px); }
}
@keyframes vsa-splash-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  50%      { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .vsa-letter, .vsa-full, .vsa-full span, .vsa-tagline {
    animation: none !important;
    opacity: 1;
    transform: none;
    filter: none;
  }
  .vsa-splash-leave { animation: vsa-splash-out 150ms linear forwards; }
}
`;

function injectCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function SplashIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode — still show once */
    }
    injectCss();
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const leaveAt = reduced ? 150 : 2500;
    const removeAt = reduced ? 320 : 3050;

    setVisible(true);
    const t1 = window.setTimeout(() => setLeaving(true), leaveAt);
    const t2 = window.setTimeout(() => setVisible(false), removeAt);
    // Hard safety net — even if anything above fails, remove in 4.5s.
    const t3 = window.setTimeout(() => setVisible(false), 4500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={'vsa-splash ' + (leaving ? 'vsa-splash-leave' : '')}
      aria-hidden="true"
      role="presentation"
      onClick={() => {
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 260);
      }}
    >
      <div className="vsa-splash-aurora" />
      <div className="vsa-splash-aurora b" />

      <div className="vsa-splash-mark">
        <span className="vsa-letter v">V</span>
        <span className="vsa-gap" />
        <span className="vsa-letter s">S</span>
        <span className="vsa-gap" />
        <span className="vsa-letter a">A</span>

        <div className="vsa-full" aria-hidden>
          <span>Viora</span>
          <span className="w2">Smart</span>
          <span>Academy</span>
        </div>
      </div>

      <div className="vsa-tagline">Viora Smart Academy</div>
    </div>
  );
}
