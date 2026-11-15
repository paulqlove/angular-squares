import { SPLIT_PRESETS, type QuarterSplit } from '../../core/plans';
import type { EspnGame, SportType } from '../../core/services/espn.service';
import type { BoardSize } from '../../core/services/game.service';
import { splitToTenths } from '../../core/utils/create-game-draft';

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

export const QUARTERS: readonly { key: keyof QuarterSplit; label: string }[] = [
  { key: 'q1', label: 'Q1' }, { key: 'q2', label: 'Q2' }, { key: 'q3', label: 'Q3' }, { key: 'q4', label: 'Q4' }
];

/** Games whose short or full team names contain the search, ignoring case. */
export function filterGames(games: EspnGame[], search: string): EspnGame[] {
  const query = search.toLowerCase().trim();
  if (!query) return games;
  return games.filter(g =>
    g.homeTeam.toLowerCase().includes(query) ||
    g.awayTeam.toLowerCase().includes(query) ||
    g.homeTeamFull.toLowerCase().includes(query) ||
    g.awayTeamFull.toLowerCase().includes(query)
  );
}

/** The preset the split matches, or 'custom'. The split is in percent. */
export function activeSplitPreset(splitPct: QuarterSplit): string {
  const t = splitToTenths(splitPct);
  return SPLIT_PRESETS.find(p => t && p.split.q1 === t.q1 && p.split.q2 === t.q2 && p.split.q3 === t.q3 && p.split.q4 === t.q4)?.id ?? 'custom';
}

/** What is left to reach 100%, for example "40%". */
export function splitRemaining(splitPct: QuarterSplit): string {
  const total = QUARTERS.reduce((sum, q) => sum + (Number(splitPct[q.key]) || 0), 0);
  return (Math.round((100 - total) * 10) / 10).toString() + '%';
}

/** The split as typed, for example "20 / 20 / 20 / 30". */
export function splitText(splitPct: QuarterSplit): string {
  const fmt = (v: number) => (Math.round(Number(v) * 10) / 10).toString();
  return QUARTERS.map(q => fmt(splitPct[q.key])).join(' / ');
}

export interface SummaryParts {
  /** "SF @ KC" for a picked game or custom teams; empty when there are none yet. */
  matchup: string;
  boardSize: BoardSize;
  price: number;
}

/** One line of context above the optional steps, for example "SF @ KC · 100 squares · 10 pts". */
export function summaryLine(parts: SummaryParts): string {
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
