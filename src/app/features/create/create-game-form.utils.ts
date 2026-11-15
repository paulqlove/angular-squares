import type { EspnGame, SportType } from '../../core/services/espn.service';
import type { BoardSize } from '../../core/services/game.service';

export const BOARD_SIZE_OPTIONS: readonly { value: BoardSize; label: string; description: string }[] = [
  { value: 100, label: '100 squares', description: '10×10 grid (classic)' },
  { value: 50, label: '50 squares', description: '5×10 grid' },
  { value: 25, label: '25 squares', description: '5×5 grid' }
];

export const SPORT_OPTIONS: readonly { value: SportType | 'custom'; label: string }[] = [
  { value: 'nfl', label: 'NFL' },
  { value: 'ncaaf', label: 'NCAA' },
  { value: 'ufl', label: 'UFL' },
  { value: 'nba', label: 'NBA' },
  { value: 'wnba', label: 'WNBA' },
  { value: 'afl', label: 'AFL' },
  { value: 'custom', label: 'Custom' }
];

export const PRICE_PRESETS: readonly number[] = [0, 5, 10, 20, 50];

export interface SummaryParts {
  /** "SF @ KC" for a picked game or custom teams; empty when there are none yet. */
  matchup: string;
  boardSize: BoardSize;
  price: number;
}

/** One line of context above the optional steps, for example "SF @ KC · 100 squares · 10 pts". */
export function formatSummaryLine(parts: SummaryParts): string {
  return [parts.matchup, `${parts.boardSize} squares`, parts.price === 0 ? 'No points' : `${parts.price} pts`].filter(Boolean).join(' · ');
}

/** The matchup as "Away @ Home", skipping a team not typed yet. */
export function matchup(away: string, home: string): string {
  return [away.trim(), home.trim()].filter(Boolean).join(' @ ');
}

/** How the board will look in the host's open boards, for example "Party · Points per square: 10 · 0/100 taken". */
export function openBoardPreview(name: string, price: number, boardSize: BoardSize): string {
  return `${name || 'Your board'} · Points per square: ${price} · 0/${boardSize} taken`;
}

/** A restored pick that has left the schedule, rebuilt so the board can still be made. */
export function stubGame(game: { awayTeam: string; homeTeam: string; id: string }): EspnGame {
  return {
    id: game.id, name: `${game.awayTeam} @ ${game.homeTeam}`, homeTeam: game.homeTeam, awayTeam: game.awayTeam,
    homeTeamFull: game.homeTeam, awayTeamFull: game.awayTeam, homeScore: 0, awayScore: 0, period: 0, clock: '',
    status: 'pre', completed: false, quarters: [], date: ''
  };
}
