'use client';

/**
 * Lightweight animated SVG illustration of a teacher near a blackboard.
 * Used in the landing hero so we don't depend on WebGL / network GLB.
 */

export function AnimatedTeacher() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-glass">
      {/* Aurora wash */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-aurora-2/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-aurora-1/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-aurora-3/15 blur-3xl" />
      </div>

      <svg viewBox="0 0 600 420" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f1424" />
            <stop offset="100%" stopColor="#070a14" />
          </linearGradient>
          <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3c2a78" />
            <stop offset="100%" stopColor="#1f1640" />
          </linearGradient>
          <radialGradient id="floor" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="rgba(167,139,250,0.25)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </radialGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Floor glow */}
        <ellipse cx="300" cy="380" rx="260" ry="22" fill="url(#floor)" />

        {/* Blackboard */}
        <g>
          <rect x="200" y="40" width="370" height="220" rx="14" fill="url(#board)" stroke="rgba(255,255,255,0.08)" />
          {/* chalk lines drawn one after another */}
          <g stroke="#7AE7C7" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path
              d="M230 90 L300 90"
              strokeDasharray="80"
              strokeDashoffset="80"
              style={{ animation: 'chalk1 5s ease-in-out infinite' }}
            />
            <path
              d="M230 120 L380 120"
              strokeDasharray="160"
              strokeDashoffset="160"
              style={{ animation: 'chalk2 5s ease-in-out infinite', animationDelay: '0.5s' }}
            />
            <path
              d="M230 150 q 60 -30 120 0 t 120 0"
              strokeDasharray="260"
              strokeDashoffset="260"
              style={{ animation: 'chalk3 5s ease-in-out infinite', animationDelay: '1s' }}
            />
          </g>
          {/* formula text */}
          <g
            fill="#A78BFA"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontSize="22"
            style={{ opacity: 0, animation: 'fadeIn 5s ease-in-out infinite', animationDelay: '1.6s' }}
          >
            <text x="232" y="200">a² + b² = c²</text>
          </g>
          {/* highlight rect */}
          <rect
            x="225"
            y="178"
            width="160"
            height="36"
            rx="6"
            fill="none"
            stroke="#F5D061"
            strokeWidth="2"
            strokeDasharray="4 4"
            style={{ opacity: 0, animation: 'fadeIn 5s ease-in-out infinite', animationDelay: '2.4s' }}
          />
        </g>

        {/* Teacher */}
        <g style={{ transformOrigin: '120px 250px', animation: 'sway 4s ease-in-out infinite' }}>
          {/* shadow */}
          <ellipse cx="120" cy="385" rx="55" ry="6" fill="rgba(0,0,0,0.4)" />

          {/* legs */}
          <rect x="100" y="320" width="14" height="60" rx="6" fill="#1a1f33" />
          <rect x="126" y="320" width="14" height="60" rx="6" fill="#1a1f33" />

          {/* body */}
          <path
            d="M80 230 Q120 210 160 230 L165 325 Q120 335 75 325 Z"
            fill="url(#suit)"
            stroke="rgba(255,255,255,0.06)"
          />
          {/* tie */}
          <path d="M118 230 L122 230 L126 270 L120 285 L114 270 Z" fill="#F5D061" />

          {/* arm holding chalk (animated wave/point) */}
          <g
            style={{
              transformOrigin: '155px 240px',
              animation: 'pointArm 4s ease-in-out infinite',
            }}
          >
            <path
              d="M155 235 Q200 220 235 200"
              stroke="url(#suit)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* hand */}
            <circle cx="240" cy="198" r="7" fill="#f1c4a4" />
            {/* chalk */}
            <rect
              x="244"
              y="190"
              width="14"
              height="4"
              rx="2"
              fill="#fff"
              transform="rotate(-25 251 192)"
            />
          </g>

          {/* other arm at side */}
          <path
            d="M85 240 Q70 280 78 320"
            stroke="url(#suit)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />

          {/* head */}
          <g style={{ transformOrigin: '120px 200px', animation: 'nod 4s ease-in-out infinite' }}>
            {/* neck */}
            <rect x="113" y="208" width="14" height="12" fill="#f1c4a4" />
            {/* face */}
            <circle cx="120" cy="190" r="26" fill="#f1c4a4" filter="url(#soft)" />
            {/* hair */}
            <path
              d="M94 188 Q98 162 120 160 Q142 162 146 188 Q140 178 120 178 Q100 178 94 188Z"
              fill="#2a2238"
            />
            {/* glasses */}
            <g stroke="#1a1f33" strokeWidth="2" fill="none">
              <circle cx="111" cy="192" r="6" />
              <circle cx="129" cy="192" r="6" />
              <line x1="117" y1="192" x2="123" y2="192" />
            </g>
            {/* eyes (blink) */}
            <g fill="#1a1f33">
              <rect
                x="109"
                y="190"
                width="4"
                height="4"
                rx="2"
                style={{ animation: 'blink 4s ease-in-out infinite' }}
              />
              <rect
                x="127"
                y="190"
                width="4"
                height="4"
                rx="2"
                style={{ animation: 'blink 4s ease-in-out infinite' }}
              />
            </g>
            {/* mouth (talks) */}
            <ellipse
              cx="120"
              cy="204"
              rx="5"
              ry="3"
              fill="#3a1f2c"
              style={{ animation: 'talk 0.6s ease-in-out infinite' }}
            />
          </g>
        </g>

        {/* tiny particles */}
        <g fill="#7AE7C7">
          <circle cx="430" cy="260" r="2" style={{ animation: 'rise 6s ease-in-out infinite', animationDelay: '0s' }} />
          <circle cx="490" cy="240" r="1.5" style={{ animation: 'rise 6s ease-in-out infinite', animationDelay: '1.5s' }} />
          <circle cx="370" cy="290" r="1.5" style={{ animation: 'rise 6s ease-in-out infinite', animationDelay: '3s' }} />
        </g>
      </svg>

      <style jsx>{`
        @keyframes chalk1 { 0%,12% {stroke-dashoffset: 80} 30%,80% {stroke-dashoffset: 0} 90%,100% {stroke-dashoffset: 80} }
        @keyframes chalk2 { 0%,18% {stroke-dashoffset: 160} 38%,80% {stroke-dashoffset: 0} 92%,100% {stroke-dashoffset: 160} }
        @keyframes chalk3 { 0%,28% {stroke-dashoffset: 260} 52%,80% {stroke-dashoffset: 0} 95%,100% {stroke-dashoffset: 260} }
        @keyframes fadeIn { 0%,40% {opacity: 0} 60%,80% {opacity: 1} 95%,100% {opacity: 0} }
        @keyframes sway { 0%,100% {transform: translateX(0)} 50% {transform: translateX(2px)} }
        @keyframes nod { 0%,100% {transform: rotate(-1deg)} 50% {transform: rotate(1deg)} }
        @keyframes blink {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 97% { transform: scaleY(0.1); }
        }
        @keyframes talk { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1.1); } }
        @keyframes pointArm {
          0%, 100% { transform: rotate(0deg); }
          40%, 60% { transform: rotate(-6deg); }
        }
        @keyframes rise {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-80px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
