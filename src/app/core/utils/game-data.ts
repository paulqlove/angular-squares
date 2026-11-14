import type { AutoManageResult, AutoManageSettings } from './auto-manage';
import type { EmptyQuarterRule, QuarterSplit } from '../plans';

// Board and game shapes shared by GameService and its helper services.
// game.service.ts re-exports all of these, so existing imports keep working.

export type SportType = 'nfl' | 'nba' | 'ncaaf' | 'ufl' | 'wnba' | 'afl';

/** Board size: 100 (10x10), 50 (5x10), or 25 (5x5) squares. */
export type BoardSize = 100 | 50 | 25;

/** Square counts by position in a board's paidPlayers list (an array, or an object with index keys from the database). */
export type PaidCounts = { [index: number]: number };

/** Get dimensions for a board size: { rows, cols } */
export function getBoardDimensions(size: BoardSize): { rows: number; cols: number } {
  switch (size) {
    case 25: return { rows: 5, cols: 5 };
    case 50: return { rows: 5, cols: 10 };
    default: return { rows: 10, cols: 10 };
  }
}

export interface TvLink {
  boards: string[];
  interval: number;
}

export interface EspnLiveSnapshot {
  status: 'pre' | 'in' | 'post';
  period: number;
  clock: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  quarters: { home: number; away: number }[];
}

export interface GameData {
  id?: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  /** Board size: 100 (10x10), 50 (5x10), or 25 (5x5). Defaults to 100. */
  boardSize?: BoardSize;
  selectedSquares: { [key: string]: string };
  homeNumbers: (number | null)[];
  awayNumbers: (number | null)[];
  scores: {
    q1: { home: number; away: number };
    q2: { home: number; away: number };
    q3: { home: number; away: number };
    q4: { home: number; away: number };
  };
  pricePerSquare: number;
  isRandomized: boolean;
  isLocked: boolean;
  homeTeam: string;
  awayTeam: string;
  winners?: { [key: string]: string };
  playerColors?: { [key: string]: string };
  hostNote?: string;
  /** The host lets players on one of their full boards see and join this one. */
  showInOpenBoards?: boolean;
  /** Lock and draw before kickoff (Season Pass). The server does the work. */
  autoManage?: AutoManageSettings;
  autoManageResult?: AutoManageResult;
  /** Season Pass: most squares one name can claim on this board. */
  maxSquaresPerPlayer?: number;
  paidPlayers?: string[];
  /** By position in paidPlayers: how many squares that name held when the host confirmed it. A rename keeps the position. */
  paidSquares?: PaidCounts;
  espnEventId?: string | null;
  espnSport?: SportType | null;
  espnLive?: EspnLiveSnapshot;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  playerUserIds?: { [name: string]: string };
  /** Host's plan stamp: no ads on this board until this time (ms). */
  adFreeUntil?: number;
  /** Custom per-quarter split in tenths of a percent (paid plans). */
  quarterSplit?: QuarterSplit | null;
  /** What an unclaimed winning square does to that quarter's points. Missing means the default. */
  emptyQuarterRule?: EmptyQuarterRule;
}

export interface GameListItem {
  id: string;
  name: string;
  ownerName: string;
  homeTeam: string;
  awayTeam: string;
  createdAt: number;
  playerCount: number;
  squaresFilled: number;
  isLocked: boolean;
  /** Whether the numbers are drawn. */
  isRandomized?: boolean;
  pricePerSquare: number;
  /** Board size: 100 (10x10), 50 (5x10), or 25 (5x5). Defaults to 100. */
  boardSize: BoardSize;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  espnEventId?: string;
  espnSport?: SportType;
  hostNote?: string;
  showInOpenBoards?: boolean;
  autoManage?: AutoManageSettings;
  maxSquaresPerPlayer?: number;
  emptyQuarterRule?: EmptyQuarterRule;
  confirmedCount: number;
}
