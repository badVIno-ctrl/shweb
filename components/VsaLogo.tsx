'use client';

/**
 * Viora Smart Academy logo. Geometric "V" + "S" + "A" mark made of three
 * intersecting glass strokes with an aurora gradient. Pure SVG so it scales
 * and can sit beside the wordmark in headers / footers.
 */
export function VsaLogo({ size = 36, withGlow = true }: { size?: number; withGlow?: boolean }) {
  const id = `vsa-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-label="Viora Smart Academy"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7AE7C7" />
          <stop offset="55%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#FF8FB1" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        {withGlow && (
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* glass tile */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}-s)`} stroke="rgba(255,255,255,0.16)" />

      {/* Stylised "V" formed by two strokes — animated draw-in on mount, plus a
       *  perpetual breathing pulse so the logo feels "alive". */}
      <g
        stroke={`url(#${id}-g)`}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={withGlow ? `url(#${id}-glow)` : undefined}
      >
        <path d="M14 16 L32 48 L50 16" className="vsa-stroke vsa-stroke-1" />
        <path d="M22 16 L32 36 L42 16" opacity="0.55" className="vsa-stroke vsa-stroke-2" />
      </g>

      {/* grad-cap diamond — gently floats and the gold gem twinkles */}
      <g className="vsa-cap">
        <path d="M32 8 L40 13 L32 18 L24 13 Z" fill={`url(#${id}-g)`} opacity="0.9" />
        <circle cx="40" cy="14" r="1.4" fill="#FFD86B">
          <animate attributeName="r" values="1.2;2.0;1.2" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.6s" repeatCount="indefinite" />
        </circle>
      </g>

      <style>{`
        .vsa-stroke {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: vsa-draw 1.1s ease-out forwards;
        }
        .vsa-stroke-2 { animation-delay: 0.25s; }
        .vsa-cap { transform-origin: 32px 14px; animation: vsa-float 4s ease-in-out infinite; }
        @keyframes vsa-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes vsa-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-1.2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vsa-stroke, .vsa-cap { animation: none; }
          .vsa-stroke { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

export function VsaWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      Viora <span className="bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">Smart Academy</span>
    </span>
  );
}
