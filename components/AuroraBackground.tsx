import { cn } from '@/lib/utils';

export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      {/* Base */}
      <div className="absolute inset-0 bg-bg-deep" />
      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: '160px 160px',
        }}
      />
      {/* Aurora blobs */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <defs>
          <radialGradient id="b1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7AE7C7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7AE7C7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF8FB1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF8FB1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="animate-aurora-drift" style={{ transformOrigin: '300px 200px' }}>
          <ellipse cx="300" cy="200" rx="450" ry="320" fill="url(#b1)" />
        </g>
        <g className="animate-aurora-drift-2" style={{ transformOrigin: '1300px 300px' }}>
          <ellipse cx="1300" cy="300" rx="500" ry="380" fill="url(#b2)" />
        </g>
        <g className="animate-aurora-drift-3" style={{ transformOrigin: '800px 850px' }}>
          <ellipse cx="800" cy="850" rx="600" ry="400" fill="url(#b3)" />
        </g>
      </svg>
    </div>
  );
}
