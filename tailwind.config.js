const colors = {
  primary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  accent: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  player: {
    red: '#fecaca',
    blue: '#bfdbfe',
    green: '#bbf7d0',
    yellow: '#fef08a',
    purple: '#e9d5ff',
    pink: '#fbcfe8',
    indigo: '#c7d2fe',
    orange: '#fed7aa',
    teal: '#99f6e4',
    cyan: '#a5f3fc'
  },
  warm: {
    // DEFAULT: 'hsl(18.75deg 26.02% 51.76%)',
    DEFAULT: 'hsl(150, 15%, 50%)',
    hover: 'hsl(150, 15%, 45%)',
    // hover: 'hsl(18.75deg 26.02% 46.76%)'
  }
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: colors,
      backgroundColor: {
        'page': 'var(--color-bg-page)',
        'card': 'var(--color-bg-card)',
        'card-hover': 'var(--color-bg-card-hover)',
        'input': 'var(--color-bg-input)',
        'input-hover': 'var(--color-bg-input-hover)',
        'button': colors.secondary[600],
        'button-hover': colors.secondary[700],
        'control': 'var(--color-bg-control)',
        'control-hover': 'var(--color-bg-control-hover)',
        'dialog': 'var(--color-bg-dialog)',
        'dialog-overlay': 'rgba(0, 0, 0, 0.5)',
        'square': 'var(--color-bg-square)',
        'square-hover': 'var(--color-bg-square-hover)',
        'header': 'var(--color-bg-header)',
        'header-accent': 'var(--color-bg-header-accent)',
      },
      textColor: {
        'default': 'var(--color-text-default)',
        'muted': 'var(--color-text-muted)',
        'link': colors.secondary[600],
        'link-hover': colors.secondary[700],
        'button': colors.primary[50],
        'heading': 'var(--color-text-heading)',
        'label': 'var(--color-text-label)',
        'header': 'var(--color-text-header)',
        'header-muted': 'var(--color-text-header-muted)',
      },
      borderColor: {
        'default': 'var(--color-border-default)',
        'hover': 'var(--color-border-hover)',
        'focus': colors.secondary[500],
        'input': 'var(--color-border-input)',
        'card': 'var(--color-border-card)',
      },
      ringColor: {
        'focus': colors.warm.DEFAULT,
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  safelist: [
    // Player colors (200 variants)
    'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200',
    'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-orange-200',
    'bg-teal-200', 'bg-cyan-200', 'bg-lime-200', 'bg-emerald-200',
    'bg-sky-200', 'bg-violet-200', 'bg-fuchsia-200', 'bg-rose-200',
    'bg-amber-200',
    // Player colors (100 variants)
    'bg-red-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100',
    'bg-purple-100', 'bg-pink-100', 'bg-indigo-100', 'bg-orange-100',
    'bg-teal-100', 'bg-cyan-100', 'bg-lime-100', 'bg-emerald-100',
    'bg-sky-100',
    // Other UI colors
    'bg-blue-300', 'bg-green-300', 'bg-gray-200',
    'bg-white', 'hover:bg-gray-100',
    'dark',
  ],
  plugins: [],
};
