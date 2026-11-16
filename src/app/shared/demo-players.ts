/** Made-up players for the demo boards (the welcome page's phone and the first-time host's sample game). */
export interface DemoPlayer {
  initials: string;
  color: string;
}

export const DEMO_PLAYERS: readonly DemoPlayer[] = [
  { initials: 'AL', color: 'qs-p-rose' },
  { initials: 'SA', color: 'qs-p-sky' },
  { initials: 'JO', color: 'qs-p-butter' },
  { initials: 'MI', color: 'qs-p-aqua' },
  { initials: 'LE', color: 'qs-p-orchid' },
  { initials: 'CA', color: 'qs-p-coral' },
  { initials: 'RI', color: 'qs-p-apricot' },
  { initials: 'NI', color: 'qs-p-lilac' },
  { initials: 'MA', color: 'qs-p-tan' },
  { initials: 'PA', color: 'qs-p-periwinkle' }
];
