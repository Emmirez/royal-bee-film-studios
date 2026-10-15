/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand palette (public website)
        ink: {
          950: '#121110',
          900: '#1c1b19',
          800: '#2a2825',
          700: '#3d3a35',
          600: '#5c574f',
          500: '#7a746a',
          400: '#9a9286',
        },
        paper: {
          50: '#fdfcfa',
          100: '#faf8f4',
          200: '#f3efe7',
          300: '#e9e3d8',
          400: '#d9d1c3',
        },
        gold: {
          200: '#efe2bf',
          300: '#e2cc95',
          400: '#d4b673',
          500: '#c9a961',
          600: '#b8964f',
          700: '#94763a',
        },
        // Themeable app tokens (admin light/dark) — see src/styles/index.css
        app: {
          bg: v('app-bg'),
          surface: v('app-surface'),
          raised: v('app-raised'),
          muted: v('app-muted'),
          border: v('app-border'),
          text: v('app-text'),
          subtle: v('app-subtle'),
          accent: v('app-accent'),
          'accent-ink': v('app-accent-ink'),
        },
        status: {
          success: '#2f7d5b',
          warning: '#b7791f',
          danger: '#b3412f',
          info: '#3b6a9a',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,27,25,.04), 0 8px 24px -12px rgba(28,27,25,.12)',
        lift: '0 2px 4px rgba(28,27,25,.05), 0 24px 48px -20px rgba(28,27,25,.25)',
      },
      maxWidth: {
        site: '1320px',
        prose: '68ch',
      },
      keyframes: {
        ticker: { from: { transform: 'translate3d(0,0,0)' }, to: { transform: 'translate3d(-50%,0,0)' } },
        'ticker-reverse': { from: { transform: 'translate3d(-50%,0,0)' }, to: { transform: 'translate3d(0,0,0)' } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'slide-left': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        scroll: { '0%,100%': { transform: 'translateY(0)', opacity: 1 }, '50%': { transform: 'translateY(6px)', opacity: 0.5 } },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.2,.7,.2,1) both',
        'fade-in': 'fade-in .3s ease both',
        'scale-in': 'scale-in .2s ease both',
        'slide-up': 'slide-up .28s cubic-bezier(.2,.7,.2,1) both',
        'slide-left': 'slide-left .28s cubic-bezier(.2,.7,.2,1) both',
        scroll: 'scroll 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
