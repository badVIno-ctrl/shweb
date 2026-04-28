import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0A0E1A',
          surface: '#0F1424',
        },
        aurora: {
          1: '#7AE7C7',
          2: '#A78BFA',
          3: '#FF8FB1',
        },
        accent: {
          gold: '#F5D061',
        },
        text: {
          primary: '#E8ECF5',
          muted: '#8B93A7',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
        display: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        glass: '20px',
      },
      backdropBlur: {
        glass: '24px',
      },
      boxShadow: {
        glow: '0 8px 32px -8px rgba(167, 139, 250, 0.35)',
        'glow-strong': '0 12px 40px -8px rgba(167, 139, 250, 0.55)',
      },
      animation: {
        'aurora-drift': 'aurora-drift 60s ease-in-out infinite',
        'aurora-drift-2': 'aurora-drift 80s ease-in-out infinite reverse',
        'aurora-drift-3': 'aurora-drift 100s ease-in-out infinite',
        'thinking-dot': 'thinking 1.4s ease-in-out infinite',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(8%, -6%) scale(1.1)' },
          '66%': { transform: 'translate(-6%, 8%) scale(0.95)' },
        },
        thinking: {
          '0%, 80%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
