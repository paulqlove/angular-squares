import type { EspnGame } from '../../../core/services/espn.service';
import type { QuarterWin } from './quarter-labels';
import { espnQuarterIsComplete } from './espn-winners';
import type { PlayerStats } from '../types';

/** A quarter's cumulative score. */
type QuarterScore = { home: number; away: number };

/** The four quarters' cumulative scores, as stored on the board. */
export type BoardScores = { q1: QuarterScore; q2: QuarterScore; q3: QuarterScore; q4: QuarterScore };

/** What winner math needs from a board: who holds which square and the drawn numbers on each side. */
export interface BoardLayout {
  awayNumbers: (number | null)[];
  awayPaired: boolean;
  homeNumbers: (number | null)[];
  homePaired: boolean;
  selectedSquares: { [key: string]: string };
}

const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;

/** Every quarter at 0-0, the score a new or cleared board starts on. */
export function emptyScores(): BoardScores {
  return {
    q1: { home: 0, away: 0 },
    q2: { home: 0, away: 0 },
    q3: { home: 0, away: 0 },
    q4: { home: 0, away: 0 }
  };
}

/** Check if a score digit matches a stored number (handles paired numbers for smaller boards). */
function digitMatchesNumber(digit: number, storedNumber: number | null, isPaired: boolean): boolean {
  if (storedNumber === null) return false;
  if (!isPaired) return storedNumber === digit;
  // For paired numbers: stored 0 = digits 0,1; stored 1 = digits 2,3; etc.
  return Math.floor(digit / 2) === storedNumber;
}

/** The "row-col" square a score points to, or null while that side's numbers are not drawn. */
export function squareForScore(board: BoardLayout, score: QuarterScore): string | null {
  const row = board.awayNumbers.findIndex(n => digitMatchesNumber(score.away % 10, n, board.awayPaired));
  const col = board.homeNumbers.findIndex(n => digitMatchesNumber(score.home % 10, n, board.homePaired));
  if (row === -1 || col === -1) return null;
  return `${row}-${col}`;
}

/** The player holding the square a score points to, or null when nobody holds it. */
function winnerForScore(board: BoardLayout, score: QuarterScore): string | null {
  const homeLastDigit = score.home % 10;
  const awayLastDigit = score.away % 10;
  const winningSquare = Object.entries(board.selectedSquares).find(([key]) => {
    const [row, col] = key.split('-').map(Number);
    return digitMatchesNumber(awayLastDigit, board.awayNumbers[row], board.awayPaired) &&
           digitMatchesNumber(homeLastDigit, board.homeNumbers[col], board.homePaired);
  });
  return winningSquare ? winningSquare[1] : null;
}

/**
 * Index of the last quarter with points, or -1. Scores are cumulative, so a quarter counts as played if it or any
 * later quarter has points; unplayed quarters sit at 0-0.
 */
export function lastPlayedQuarter(scores: BoardScores): number {
  let lastPlayed = -1;
  QUARTERS.forEach((quarter, i) => {
    const score = scores[quarter];
    if (score && (score.home > 0 || score.away > 0)) lastPlayed = i;
  });
  return lastPlayed;
}

/** Winners of a hand-scored board: every played quarter, never the 0-0 square of an unplayed one. */
export function manualWinners(board: BoardLayout, scores: BoardScores): { [key: string]: string } {
  const winners: { [key: string]: string } = {};
  const lastPlayed = lastPlayedQuarter(scores);
  QUARTERS.forEach((quarter, i) => {
    if (i > lastPlayed) return;
    const winner = winnerForScore(board, scores[quarter]);
    if (winner) winners[quarter] = winner;
  });
  return winners;
}

/** Winners of an ESPN-linked board: only quarters the feed has settled (see espnQuarterIsComplete). */
export function espnWinners(board: BoardLayout, scores: BoardScores, period: number, completed: boolean): { [key: string]: string } {
  const winners: { [key: string]: string } = {};
  QUARTERS.forEach((quarter, index) => {
    if (!espnQuarterIsComplete(index, period, completed)) return;
    const winner = winnerForScore(board, scores[quarter]);
    if (winner) winners[quarter] = winner;
  });
  return winners;
}

/** The squares that won a quarter: the square the quarter's score points to, when it belongs to that quarter's winner. */
export function quarterWins(board: BoardLayout, scores: BoardScores, winners: { [key: string]: string }): QuarterWin[] {
  return QUARTERS.flatMap(quarter => {
    const winner = winners[quarter], score = scores[quarter];
    if (!winner || !score) return [];
    const key = squareForScore(board, score);
    return key && board.selectedSquares[key] === winner ? [{ key, quarter }] : [];
  });
}

/**
 * The square the current score points to: the latest quarter with points, or 0-0 for a linked game before kickoff.
 * Null with no scores on an unlinked board.
 */
export function leaderSquare(board: BoardLayout, scores: BoardScores, linked: boolean): string | null {
  const hasScores = Object.values(scores).some(s => s.home > 0 || s.away > 0);
  if (!hasScores && !linked) return null;
  let currentScore: QuarterScore = { home: 0, away: 0 };
  for (const q of ['q4', 'q3', 'q2', 'q1'] as const) {
    const s = scores[q];
    if (s.home > 0 || s.away > 0) {
      currentScore = s;
      break;
    }
  }
  return squareForScore(board, currentScore);
}

/** Squares and points per player, and the board total. */
export function playerStatsFor(selectedSquares: { [key: string]: string }, price: number): { stats: { [key: string]: PlayerStats }; totalPot: number } {
  const stats: { [key: string]: PlayerStats } = {};
  let totalPot = 0;
  Object.values(selectedSquares).forEach(player => {
    if (!stats[player]) stats[player] = { squares: 0, total: 0 };
    stats[player].squares += 1;
    stats[player].total += price;
    totalPot += price;
  });
  return { stats, totalPot };
}

/** The color a new player gets: an unused one first; past the palette's size, cycle through it. */
export function nextPlayerColor(playerColors: { [key: string]: string }, palette: string[]): string {
  const usedColors = Object.values(playerColors);
  return palette.find(c => !usedColors.includes(c)) ?? palette[usedColors.length % palette.length];
}

/**
 * ESPN gives per-quarter scores; squares need cumulative ones. A final game stores the ESPN final total in Q4
 * (handles OT, Pro Bowl, etc.).
 */
export function cumulativeEspnScores(previous: BoardScores, game: Pick<EspnGame, 'quarters' | 'status' | 'homeScore' | 'awayScore'>): BoardScores {
  let homeAccum = 0;
  let awayAccum = 0;
  const scores = { ...previous };
  for (let i = 0; i < 4; i++) {
    homeAccum += game.quarters[i]?.home || 0;
    awayAccum += game.quarters[i]?.away || 0;
    scores[QUARTERS[i]] = { home: homeAccum, away: awayAccum };
  }
  if (game.status === 'post') scores.q4 = { home: game.homeScore, away: game.awayScore };
  return scores;
}

/** The parts of a board that carry player names. */
interface PlayerData {
  paidPlayers: Set<string>;
  playerColors: { [key: string]: string };
  playerUserIds: { [name: string]: string };
  selectedSquares: { [key: string]: string };
}

/**
 * A player's new name carried over the board: their squares (matched without case), color, paid mark (without case)
 * and account link. Returns the fields to save; the input is left as it is.
 */
export function renamePlayer(data: PlayerData, oldName: string, newName: string): Omit<PlayerData, 'paidPlayers'> & { paidPlayers: string[] } {
  const old = oldName.toLowerCase();
  const selectedSquares = Object.fromEntries(
    Object.entries(data.selectedSquares).map(([key, name]) => [key, name.toLowerCase() === old ? newName : name])
  );
  const paidPlayers = Array.from(data.paidPlayers).map(p => (p.toLowerCase() === old ? newName : p));
  return {
    selectedSquares,
    playerColors: renameKey(data.playerColors, oldName, newName),
    paidPlayers,
    playerUserIds: renameKey(data.playerUserIds, oldName, newName)
  };
}

/** A copy of a map without the entries `drop` picks. */
export function withoutEntries<T>(map: { [key: string]: T }, drop: (key: string, value: T) => boolean): { [key: string]: T } {
  return Object.fromEntries(Object.entries(map).filter(([key, value]) => !drop(key, value)));
}

/** A copy of a map with one key's value moved to a new key, when the old key has a value. */
function renameKey(map: { [key: string]: string }, oldKey: string, newKey: string): { [key: string]: string } {
  const copy = { ...map };
  if (copy[oldKey]) {
    copy[newKey] = copy[oldKey];
    delete copy[oldKey];
  }
  return copy;
}
