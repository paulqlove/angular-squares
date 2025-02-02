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
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: colors,
      backgroundColor: {
        'page': colors.primary[100],
        'card': colors.primary[100],
        'card-hover': colors.primary[300],
        'input': colors.primary[50],
        'input-hover': colors.primary[100],
        'button': colors.secondary[600],
        'button-hover': colors.secondary[700],
        'control': colors.primary[300],
        'control-hover': colors.primary[400],
        'dialog': colors.primary[50],
        'dialog-overlay': 'rgba(0, 0, 0, 0.5)',
        'square': colors.primary[700],
        'square-hover': colors.primary[300],
      },
      textColor: {
        'default': colors.primary[900],
        'muted': colors.primary[500],
        'link': colors.secondary[600],
        'link-hover': colors.secondary[700],
        'button': colors.primary[50],
        'heading': colors.primary[700],
        'label': colors.primary[700],
      },
      borderColor: {
        'default': colors.primary[200],
        'hover': colors.primary[300],
        'focus': colors.secondary[500],
        'input': colors.primary[300],
        'card': colors.primary[200],
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
    'bg-blue-300', 'bg-blue-200',
    'bg-green-300', 'bg-green-200',
    'bg-yellow-200',
    'bg-red-100',
    'bg-purple-200', 'hover:bg-purple-300',
    'bg-orange-200', 'hover:bg-orange-300',
    'bg-teal-200', 'hover:bg-teal-300',
    'bg-pink-200', 'hover:bg-pink-300',
    'bg-white', 'hover:bg-gray-100',
    'bg-gray-200',
  ],
  plugins: [],
};
