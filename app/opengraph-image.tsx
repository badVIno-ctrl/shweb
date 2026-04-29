import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Viora Smart Academy — 3D-учитель профильной математики ЕГЭ';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Dynamically rendered Open Graph card. Auto-discovered by Next 14 App Router
 * for the root route — meaning every social share of the site domain shows
 * this card without us pre-rendering a PNG. Uses inline SVG (no external font
 * fetches) so it's reliably fast on the edge.
 */
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          background:
            'radial-gradient(ellipse at top left, #1a1f3f 0%, #0A0E1A 60%, #06081a 100%)',
          color: '#E8ECF5',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="84" height="84" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#7AE7C7" />
                <stop offset="55%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#FF8FB1" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="60" height="60" rx="14" fill="rgba(255,255,255,0.06)" />
            <g
              stroke="url(#g)"
              strokeWidth="5.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M14 16 L32 48 L50 16" />
              <path d="M22 16 L32 36 L42 16" opacity="0.55" />
            </g>
            <path d="M32 8 L40 13 L32 18 L24 13 Z" fill="url(#g)" opacity="0.95" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>
              Viora Smart Academy
            </span>
            <span
              style={{
                marginTop: 4,
                fontSize: 18,
                letterSpacing: 6,
                color: '#A78BFA',
                textTransform: 'uppercase',
              }}
            >
              VSA
            </span>
          </div>
        </div>

        <div style={{ marginTop: 72, fontSize: 56, fontWeight: 600, lineHeight: 1.1 }}>
          3D-учитель профильной
          <br />
          математики ЕГЭ
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            color: '#9aa1b3',
            maxWidth: 880,
            lineHeight: 1.4,
          }}
        >
          Теория по 19 заданиям профиля, бесконечная практика от ИИ и живой 3D-преподаватель у
          виртуальной доски.
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: 16 }}>
          {['Mistral AI', 'Three.js', 'Next.js 14'].map((tag) => (
            <span
              key={tag}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#7AE7C7',
                fontSize: 22,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
