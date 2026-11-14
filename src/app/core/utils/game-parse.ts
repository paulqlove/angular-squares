import { isEmptyQuarterRule } from '../plans';
import type { RecentVisit } from './recent-games';
import { readAutoManage, readAutoManageResult } from './auto-manage';
import { confirmedPlayers } from './paid-squares';
import { readSquareLimit } from './square-limit';
import { BoardSize, EspnLiveSnapshot, GameData, GameListItem, SportType, TvLink, getBoardDimensions } from './game-data';

// Pure helpers that turn raw Realtime Database values into typed game data.
// No Firebase calls here, so each one can be unit tested on its own.

/** Characters for board ids. Ambiguous ones (0, O, 1, I) are left out. */
const GAME_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Intervals a TV link may rotate at, in seconds. Anything else falls back to 30. */
const TV_INTERVALS = [10, 20, 30, 60];

/** Turns a Firebase key back into the email it was made from. */
export function decodeEmailKey(key: string): string {
  return key.replace(/,/g, '.');
}

/** Makes an email usable as a Firebase key: lower case, with each . replaced by , */
export function encodeEmailKey(email: string): string {
  return email.toLowerCase().replace(/\./g, ',');
}

/** A short, shareable board id: six characters from GAME_ID_CHARS. */
export function generateGameId(random: () => number = Math.random): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += GAME_ID_CHARS.charAt(Math.floor(random() * GAME_ID_CHARS.length));
  }
  return result;
}

/** True for a board id the live-score index accepts: six letters and digits. */
export function isBoardId(id: string): boolean {
  return /^[A-Za-z0-9]{6}$/.test(id);
}

/** True for an ESPN event id that is safe to use as a database key. */
export function isLinkableEspnId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,50}$/.test(id);
}

/** Any value that is not a known sport reads as NFL. */
export function normalizeSport(value: unknown): SportType {
  if (value === 'nfl' || value === 'nba' || value === 'ncaaf' || value === 'ufl' || value === 'wnba' || value === 'afl') {
    return value;
  }
  return 'nfl';
}

/**
 * Builds GameData from a raw games/{gameId} value, filling defaults for anything missing.
 * `now` stands in for a missing createdAt.
 */
export function parseGameData(gameId: string, rawData: any, now: number = Date.now()): GameData {
  const boardSize: BoardSize = rawData.boardSize === 25 || rawData.boardSize === 50 ? rawData.boardSize : 100;
  const { rows, cols } = getBoardDimensions(boardSize);
  return {
    id: gameId,
    name: rawData.name || 'Football Squares',
    ownerId: rawData.ownerId || '',
    ownerName: rawData.ownerName || 'Unknown',
    createdAt: rawData.createdAt || now,
    boardSize,
    // Squares are stored under `squares` but the app calls them selectedSquares.
    selectedSquares: { ...(rawData.squares || {}) },
    homeNumbers: rawData.homeNumbers || Array(cols).fill(null),
    awayNumbers: rawData.awayNumbers || Array(rows).fill(null),
    scores: rawData.scores || {
      q1: { home: 0, away: 0 },
      q2: { home: 0, away: 0 },
      q3: { home: 0, away: 0 },
      q4: { home: 0, away: 0 }
    },
    playerColors: rawData.playerColors || {},
    winners: rawData.winners || {},
    pricePerSquare: rawData.pricePerSquare || 10,
    isRandomized: rawData.isRandomized || false,
    isLocked: rawData.isLocked || false,
    homeTeam: rawData.homeTeam || '',
    awayTeam: rawData.awayTeam || '',
    hostNote: rawData.hostNote || '',
    showInOpenBoards: !!rawData.showInOpenBoards,
    autoManage: readAutoManage(rawData.autoManage),
    autoManageResult: readAutoManageResult(rawData.autoManageResult),
    maxSquaresPerPlayer: readSquareLimit(rawData.maxSquaresPerPlayer),
    paidPlayers: rawData.paidPlayers || [],
    paidSquares: rawData.paidSquares || {},
    espnEventId: rawData.espnEventId || undefined,
    espnSport: rawData.espnSport || undefined,
    espnLive: readEspnLive(rawData.espnLive),
    managerId: rawData.managerId || undefined,
    managerEmail: rawData.managerEmail || undefined,
    managerName: rawData.managerName || undefined,
    adFreeUntil: rawData.adFreeUntil || 0,
    quarterSplit: rawData.quarterSplit || null,
    emptyQuarterRule: isEmptyQuarterRule(rawData.emptyQuarterRule) ? rawData.emptyQuarterRule : undefined,
    playerUserIds: rawData.playerUserIds || undefined
  };
}

/**
 * The square, color, paid and user-id changes that rename a player on one board, or null when the
 * old name holds no square there. Names match ignoring case.
 */
export function renamePlayerInGame(game: GameData, oldName: string, newName: string): Partial<GameData> | null {
  const hasSquares = Object.values(game.selectedSquares).some(
    p => p.toLowerCase() === oldName.toLowerCase()
  );
  if (!hasSquares) return null;

  const updatedSquares = { ...game.selectedSquares };
  for (const key of Object.keys(updatedSquares)) {
    if (updatedSquares[key].toLowerCase() === oldName.toLowerCase()) {
      updatedSquares[key] = newName;
    }
  }

  const updatedColors = { ...game.playerColors };
  if (updatedColors[oldName]) {
    updatedColors[newName] = updatedColors[oldName];
    delete updatedColors[oldName];
  }

  const updatedPaidPlayers = (game.paidPlayers || []).map(p =>
    p.toLowerCase() === oldName.toLowerCase() ? newName : p
  );

  const updatedPlayerUserIds = { ...(game.playerUserIds || {}) };
  if (updatedPlayerUserIds[oldName]) {
    updatedPlayerUserIds[newName] = updatedPlayerUserIds[oldName];
    delete updatedPlayerUserIds[oldName];
  }

  return {
    selectedSquares: updatedSquares,
    playerColors: updatedColors,
    paidPlayers: updatedPaidPlayers,
    playerUserIds: updatedPlayerUserIds
  };
}

/** Reads espnLive as written by the Cloud Function. Anything without a known status reads as undefined. */
export function readEspnLive(value: unknown): EspnLiveSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const status = raw['status'];
  if (status !== 'pre' && status !== 'in' && status !== 'post') return undefined;

  // Firebase can hand an array back as an object keyed "0", "1", ...
  const quartersRaw = raw['quarters'];
  let quarterList: unknown[] = [];
  if (Array.isArray(quartersRaw)) {
    quarterList = quartersRaw;
  } else if (quartersRaw && typeof quartersRaw === 'object') {
    quarterList = Object.keys(quartersRaw)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => (quartersRaw as Record<string, unknown>)[key]);
  }

  return {
    status,
    period: typeof raw['period'] === 'number' ? raw['period'] : 0,
    clock: typeof raw['clock'] === 'string' ? raw['clock'] : '',
    completed: raw['completed'] === true,
    homeScore: typeof raw['homeScore'] === 'number' ? raw['homeScore'] : 0,
    awayScore: typeof raw['awayScore'] === 'number' ? raw['awayScore'] : 0,
    homeTeam: typeof raw['homeTeam'] === 'string' ? raw['homeTeam'] : '',
    awayTeam: typeof raw['awayTeam'] === 'string' ? raw['awayTeam'] : '',
    quarters: quarterList.map(quarter => {
      const row = quarter && typeof quarter === 'object' ? quarter as Record<string, unknown> : {};
      return {
        home: typeof row['home'] === 'number' ? row['home'] : 0,
        away: typeof row['away'] === 'number' ? row['away'] : 0
      };
    })
  };
}

/** One visit per board in a users/{uid}/games or users/{uid}/joinedGames value, timed by `field`. */
export function readGameIndexVisits(value: unknown, field: 'createdAt' | 'joinedAt'): RecentVisit[] {
  if (value === null || value === undefined) return [];
  return Object.entries(value as Record<string, Record<string, unknown> | null>)
    .map(([id, v]) => ({ id, at: Number(v?.[field]) || 0 }));
}

/** Reads a tvLinks/{token} value. null when the link is off or lists no boards. */
export function readTvLink(value: unknown): TvLink | null {
  const link = value as { boards?: unknown; interval?: unknown } | null;
  const boards = typeof link?.boards === 'string' ? link.boards.split(',').filter(Boolean) : [];
  if (!link || !boards.length) return null;
  const interval = TV_INTERVALS.includes(Number(link.interval)) ? Number(link.interval) : 30;
  return { boards, interval };
}

/** Board ids from a users/{uid}/games value, newest first (same order as the dashboard). */
export function sortGameIdsNewestFirst(value: Record<string, { createdAt?: number }>): string[] {
  return Object.entries(value)
    .sort((a, b) => (b[1]?.createdAt ?? 0) - (a[1]?.createdAt ?? 0))
    .map(([id]) => id);
}

/**
 * The dashboard row for one board. Owned boards also carry the host settings
 * (open boards, auto-manage, square limit, empty-quarter rule); joined boards do not.
 */
export function toGameListItem(gameId: string, game: GameData, includeHostSettings: boolean): GameListItem {
  const playerNames = new Set(Object.values(game.selectedSquares));
  const squaresFilled = Object.keys(game.selectedSquares).length;
  const confirmedCount = confirmedPlayers(game.selectedSquares, game.paidPlayers || [], game.paidSquares).size;
  return {
    id: gameId,
    name: game.name,
    ownerName: game.ownerName,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    createdAt: game.createdAt,
    playerCount: playerNames.size,
    squaresFilled,
    isLocked: game.isLocked,
    isRandomized: game.isRandomized,
    pricePerSquare: game.pricePerSquare,
    boardSize: game.boardSize || 100,
    managerId: game.managerId,
    managerEmail: game.managerEmail,
    managerName: game.managerName,
    espnEventId: game.espnEventId || undefined,
    espnSport: game.espnSport || undefined,
    hostNote: game.hostNote,
    ...(includeHostSettings
      ? {
          showInOpenBoards: game.showInOpenBoards,
          autoManage: game.autoManage,
          maxSquaresPerPlayer: game.maxSquaresPerPlayer,
          emptyQuarterRule: isEmptyQuarterRule(game.emptyQuarterRule) ? game.emptyQuarterRule : undefined
        }
      : {}),
    confirmedCount
  };
}
