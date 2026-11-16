/** Made-up data for the first-time host's "What a game looks like" preview. Decorative only: nothing here is read or saved. */

/** One square: the player's initials and palette color, or null for an open square. */
export type SampleSquare = { initials: string; color: string } | null;

const AL = { initials: 'AL', color: 'qs-p-rose' };
const SA = { initials: 'SA', color: 'qs-p-sky' };
const JO = { initials: 'JO', color: 'qs-p-butter' };
const MI = { initials: 'MI', color: 'qs-p-aqua' };
const LE = { initials: 'LE', color: 'qs-p-orchid' };
const CA = { initials: 'CA', color: 'qs-p-coral' };
const RI = { initials: 'RI', color: 'qs-p-apricot' };
const NI = { initials: 'NI', color: 'qs-p-lilac' };
const MA = { initials: 'MA', color: 'qs-p-tan' };
const PA = { initials: 'PA', color: 'qs-p-periwinkle' };

/** Numbers along the top (one team) and down the side (the other). */
export const SAMPLE_COLUMNS: readonly number[] = [7, 3, 0, 9, 4];
export const SAMPLE_ROWS: readonly number[] = [2, 8, 5, 1, 6];

/** The 5 by 5 board, row by row. */
export const SAMPLE_SQUARES: readonly (readonly SampleSquare[])[] = [
  [AL, SA, JO, null, MI],
  [LE, null, CA, RI, NI],
  [MA, PA, null, AL, null],
  [null, SA, null, JO, MI],
  [LE, CA, RI, null, null]
];

export interface SamplePlayer {
  initials: string;
  color: string;
  name: string;
  squares: number;
  confirmed: boolean;
}

export const SAMPLE_PLAYERS: readonly SamplePlayer[] = [
  { ...AL, name: 'Alex', squares: 6, confirmed: true },
  { ...SA, name: 'Sam', squares: 4, confirmed: true },
  { ...JO, name: 'Jordan', squares: 3, confirmed: false }
];

export const SAMPLE_STEPS: readonly string[] = [
  'Pick the game and board size',
  'Share the code with friends',
  'Numbers drawn, winners each quarter'
];
