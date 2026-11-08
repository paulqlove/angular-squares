import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, isValidSplit } from '../plans';
import type { BoardSize } from '../services/game.service';
import type { SportType } from '../services/espn.service';

const KEY = 'qs_create_draft';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const AUTO_SUBMIT_MAX_AGE_MS = 15 * 60 * 1000;

export interface CreateGameDraft {
  /** Season Pass: lock and draw before kickoff (needs a linked game). */
  autoManage: boolean;
  /** Set when the visitor pressed Create while signed out: finish the create after sign-in. */
  autoSubmit: boolean;
  boardSize: BoardSize;
  customAway: string;
  customHome: string;
  customPrice: number | null;
  emptyRule: EmptyQuarterRule;
  espnGame: { awayTeam: string; homeTeam: string; id: string } | null;
  hostNote: string;
  manager: string;
  name: string;
  price: number;
  savedAt: number;
  showInOpenBoards: boolean;
  splitPct: QuarterSplit;
  sport: SportType | 'custom';
}

export interface CreateGameValues {
  autoManage: boolean;
  awayTeam?: string;
  boardSize: BoardSize;
  emptyQuarterRule: EmptyQuarterRule;
  espnEventId?: string;
  espnSport?: SportType;
  homeTeam?: string;
  hostNote?: string;
  manager?: string;
  name: string;
  price: number;
  quarterSplit: QuarterSplit | null;
  showInOpenBoards: boolean;
}

export type BuildResult = { ok: true; values: CreateGameValues } | { ok: false; reason: 'name' | 'split' };

export interface Sanitizer {
  sanitizeGameName(name: string): string;
  sanitizeHostNote(note: string): string;
  sanitizeTeamName(name: string): string;
  validatePrice(price: number | string): number;
}

export function emptyDraft(): CreateGameDraft {
  return {
    autoManage: false,
    autoSubmit: false,
    boardSize: 100,
    customAway: '',
    customHome: '',
    customPrice: null,
    emptyRule: DEFAULT_EMPTY_QUARTER_RULE,
    espnGame: null,
    hostNote: '',
    manager: '',
    name: '',
    price: 10,
    savedAt: 0,
    showInOpenBoards: false,
    splitPct: { q1: 20, q2: 20, q3: 20, q4: 40 },
    sport: 'nfl'
  };
}

/** Percent inputs (one decimal) to tenths of a percent, or null when any value is not a clean tenth. */
export function splitToTenths(pct: QuarterSplit): QuarterSplit | null {
  const keys: (keyof QuarterSplit)[] = ['q1', 'q2', 'q3', 'q4'];
  const tenths = (v: number) => Math.round(Number(v) * 10);
  const clean = keys.every(k => Number.isFinite(Number(pct[k])) && Math.abs(Number(pct[k]) * 10 - tenths(pct[k])) < 1e-6);
  return clean ? { q1: tenths(pct.q1), q2: tenths(pct.q2), q3: tenths(pct.q3), q4: tenths(pct.q4) } : null;
}

export function isDefaultSplit(split: QuarterSplit | null): boolean {
  return !!split && split.q1 === 200 && split.q2 === 200 && split.q3 === 200 && split.q4 === 400;
}

/** Validates and cleans the form entries into what GameService.createGame needs. */
export function buildCreateGameValues(draft: CreateGameDraft, sanitizer: Sanitizer, customSplitsAllowed: boolean): BuildResult {
  const name = sanitizer.sanitizeGameName(draft.name);
  if (!name) return { ok: false, reason: 'name' };
  const split = splitToTenths(draft.splitPct);
  if (!isValidSplit(split)) return { ok: false, reason: 'split' };

  let homeTeam: string | undefined;
  let awayTeam: string | undefined;
  if (draft.sport === 'custom') {
    homeTeam = sanitizer.sanitizeTeamName(draft.customHome) || undefined;
    awayTeam = sanitizer.sanitizeTeamName(draft.customAway) || undefined;
  } else if (draft.espnGame) {
    homeTeam = draft.espnGame.homeTeam;
    awayTeam = draft.espnGame.awayTeam;
  }
  const linked = draft.sport !== 'custom' && draft.espnGame ? draft.espnGame.id : undefined;
  const hostNote = sanitizer.sanitizeHostNote(draft.hostNote);

  return {
    ok: true,
    values: {
      autoManage: !!linked && draft.autoManage === true,
      awayTeam,
      boardSize: draft.boardSize,
      emptyQuarterRule: draft.emptyRule,
      espnEventId: linked,
      espnSport: linked && draft.sport !== 'custom' ? draft.sport : undefined,
      homeTeam,
      hostNote: hostNote || undefined,
      manager: draft.manager.trim() || undefined,
      name,
      price: sanitizer.validatePrice(draft.price),
      quarterSplit: isDefaultSplit(split) || !customSplitsAllowed ? null : split,
      showInOpenBoards: draft.showInOpenBoards === true
    }
  };
}

/** Kept in localStorage because the emailed sign-in link opens in a new tab. Gone after two hours. */
export function saveCreateDraft(draft: CreateGameDraft, now = Date.now(), storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify({ ...draft, savedAt: now }));
  } catch {
    // Storage blocked: the visitor re-enters the form after sign-in.
  }
}

export function loadCreateDraft(now = Date.now(), storage: Pick<Storage, 'getItem' | 'removeItem'> = localStorage): CreateGameDraft | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateGameDraft>;
    if (typeof parsed.savedAt !== 'number' || now - parsed.savedAt > MAX_AGE_MS || typeof parsed.name !== 'string') {
      storage.removeItem(KEY);
      return null;
    }
    return { ...emptyDraft(), ...parsed } as CreateGameDraft;
  } catch {
    return null;
  }
}

export function clearCreateDraft(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** True while the visitor pressed Create a moment ago and is still signing in. Stale drafts never create a board on their own. */
export function isPendingAutoSubmit(draft: CreateGameDraft | null, now = Date.now()): draft is CreateGameDraft {
  return !!draft && draft.autoSubmit === true && now - draft.savedAt < AUTO_SUBMIT_MAX_AGE_MS;
}
