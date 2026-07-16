import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Os valores 700/900/950 são dinâmicos via CSS vars (controlados no admin).
        // 50/100/500/600 permanecem estáticos para preservar o design.
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: 'rgb(var(--color-secondary) / <alpha-value>)',
          900: 'rgb(var(--color-primary) / <alpha-value>)',
          950: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          300: '#cbd5e1',
          100: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
        cardHover: '0 4px 12px rgba(15,23,42,0.08), 0 12px 28px rgba(15,23,42,0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 500ms cubic-bezier(0.2, 0.65, 0.3, 1) both',
        'slide-in-left': 'slideInLeft 260ms cubic-bezier(0.2, 0.65, 0.3, 1) both',
        'blob-a': 'blobA 22s ease-in-out infinite',
        'blob-b': 'blobB 28s ease-in-out infinite',
        'blob-c': 'blobC 34s ease-in-out infinite',
        'aurora': 'aurora 18s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        blobA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(6%, -8%) scale(1.08)' },
          '66%':      { transform: 'translate(-4%, 6%) scale(0.94)' },
        },
        blobB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(-8%, 4%) scale(1.12)' },
        },
        blobC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(0.96)' },
          '40%':      { transform: 'translate(5%, 5%) scale(1.06)' },
          '80%':      { transform: 'translate(-3%, -6%) scale(1.02)' },
        },
        aurora: {
          '0%, 100%': { opacity: '0.55' },
          '50%':      { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
