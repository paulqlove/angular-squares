const colors = {
  // Legacy color ramps (keep during migration)
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
  // Player pastels (unchanged)
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
  // New QS design system tokens
  qs: {
    bg: 'var(--qs-bg)',
    panel: 'var(--qs-panel)',
    'panel-2': 'var(--qs-panel-2)',
    canvas: 'var(--qs-canvas)',
    ink: 'var(--qs-ink)',
    muted: 'var(--qs-muted)',
    line: 'var(--qs-line)',
    'line-strong': 'var(--qs-line-strong)',
    accent: 'var(--qs-accent)',
    'accent-hover': 'var(--qs-accent-hover)',
    'accent-soft': 'var(--qs-accent-soft)',
    'on-accent': 'var(--qs-on-accent)',
    live: 'var(--qs-live)',
    'live-fill': 'var(--qs-live-fill)',
    ok: 'var(--qs-ok)',
    'ok-soft': 'var(--qs-ok-soft)',
    warn: 'var(--qs-warn)',
    'warn-soft': 'var(--qs-warn-soft)',
    bad: 'var(--qs-bad)',
    'bad-soft': 'var(--qs-bad-soft)',
    tile: 'var(--qs-tile)',
    'tile-ink': 'var(--qs-tile-ink)',
    'tile-muted': 'var(--qs-tile-muted)',
    'tile-ok': 'var(--qs-tile-ok)',
    'tile-bad': 'var(--qs-tile-bad)',
    'tile-open': 'var(--qs-tile-open)',
    'tile-count': 'var(--qs-tile-count)',
  },
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
        'button': colors.secondary[600],
        'button-hover': colors.secondary[700],
        'dialog-overlay': 'rgba(0, 0, 0, 0.5)',
      },
      textColor: {
        'link': colors.secondary[600],
        'link-hover': colors.secondary[700],
        'button': colors.primary[50],
      },
      borderColor: {
        'focus': colors.secondary[500],
      },
      ringColor: {
        'focus': 'var(--qs-accent)',
      },
      fontWeight: {
        bold: '600',
        extrabold: '600',
      },
      fontFamily: {
        sans: ['var(--qs-font-sans)'],
        mono: ['var(--qs-font-mono)'],
      },
      borderRadius: {
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        '3xl': '10px',
        chip: '4px',
        btn: '6px',
        inner: '8px',
        card: '10px',
        bar: '12px',
      },
      boxShadow: {
        md: 'var(--qs-shadow)',
        lg: 'var(--qs-shadow)',
        xl: 'var(--qs-shadow-pop)',
        '2xl': 'var(--qs-shadow-pop)',
        card: 'var(--qs-shadow)',
        pop: 'var(--qs-shadow-pop)',
      },
    },
  },
  safelist: [
    // Other UI colors
    'bg-blue-300', 'bg-green-300', 'bg-gray-200',
    'bg-white', 'hover:bg-gray-100',
    'dark',
    // QS design system classes
    'bg-qs-bg', 'bg-qs-panel', 'bg-qs-panel-2', 'bg-qs-canvas',
    'bg-qs-accent', 'bg-qs-accent-soft', 'bg-qs-tile',
    'text-qs-ink', 'text-qs-muted', 'text-qs-accent', 'text-qs-on-accent',
    'text-qs-tile-ink', 'text-qs-live',
    'border-qs-line', 'border-qs-line-strong', 'border-qs-accent',
    'rounded-card', 'rounded-btn', 'rounded-inner', 'rounded-chip',
    'shadow-card', 'shadow-pop',
    // Dynamic grid classes for different board sizes
    'grid-cols-[1.5rem_repeat(5,minmax(0,1fr))]',
    'grid-cols-[1.5rem_repeat(10,minmax(0,1fr))]',
    'sm:grid-cols-[2.25rem_repeat(5,minmax(0,1fr))]',
    'sm:grid-cols-[2.25rem_repeat(10,minmax(0,1fr))]',
    // Mini board preview grids
    'grid-cols-5',
    'grid-cols-10',
    // Probability heatmap grids
    'grid-cols-[auto_repeat(5,minmax(0,1fr))]',
    'grid-cols-[auto_repeat(10,minmax(0,1fr))]',
  ],
  plugins: [
    // Dashboard board cards: the tall card, in Grid view only. On a card wider than 28rem, or from 640px up.
    // Compact always keeps the short row, at every width.
    ({ addVariant }) => addVariant('tall', ['@container (min-width: 28rem) { .qs-grid-view & }', '@media (min-width: 640px) { .qs-grid-view & }']),
  ],
};
