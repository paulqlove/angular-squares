/** Player square colors: warm pastels, no greens, so emerald only ever means leader/winner. */
export const PLAYER_COLORS = [
  'qs-p-rose', 'qs-p-sky', 'qs-p-butter', 'qs-p-lilac', 'qs-p-coral',
  'qs-p-aqua', 'qs-p-orchid', 'qs-p-apricot', 'qs-p-periwinkle', 'qs-p-tan'
];

/** Older games stored Tailwind classes (bg-red-200, bg-qs-ok-soft...). Map them to the nearest palette color. */
const LEGACY_HUES: { [hue: string]: string } = {
  red: 'qs-p-rose', rose: 'qs-p-rose', pink: 'qs-p-orchid', fuchsia: 'qs-p-orchid',
  orange: 'qs-p-coral', amber: 'qs-p-apricot', yellow: 'qs-p-butter', lime: 'qs-p-butter',
  green: 'qs-p-tan', emerald: 'qs-p-tan', 'qs-ok-soft': 'qs-p-tan', 'qs-accent-soft': 'qs-p-tan',
  teal: 'qs-p-aqua', cyan: 'qs-p-aqua', sky: 'qs-p-sky', blue: 'qs-p-sky',
  indigo: 'qs-p-periwinkle', violet: 'qs-p-lilac', purple: 'qs-p-lilac'
};

export function toPlayerColor(color: string | undefined): string {
  if (!color || color.startsWith('qs-p-')) return color || '';
  const hue = color.replace(/^bg-/, '').replace(/-\d+$/, '');
  return LEGACY_HUES[hue] || 'qs-p-tan';
}

export function normalizePlayerColors(colors: { [name: string]: string }): { [name: string]: string } {
  return Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, toPlayerColor(color)]));
}
