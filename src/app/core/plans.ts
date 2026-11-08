/**
 * Plans: Free, or one Season Pass at $5.99 one time (decided Nov 5, 2026; see docs/FUTURE.md).
 * Features check these flags, never prices, so changing a plan is a one-line edit here.
 * Entitlements live at entitlements/{uid} = { plan, expiresAt } and are written only by an admin
 * (later a payment webhook). Admins (admins/{uid}) get everything.
 */
export type PaidPlanId = 'season';
export type PlanId = 'free' | PaidPlanId | 'admin';

export interface PlanFeatures {
  label: string;
  priceUsd: number;
  /** Boards a host can have active at once. */
  activeBoards: number;
  /** Change the per-quarter points split (free hosts keep 20/20/20/40). */
  customSplits: boolean;
  /** No ads on this host's boards. */
  adFree: boolean;
  /** ESPN auto-sync of scores. Not enforced yet: it stays free until checkout exists. */
  liveScoring: boolean;
  /** Lock the board, shrink it if half empty and draw the numbers just after kickoff. */
  autoManage: boolean;
}

export const DAY_MS = 86_400_000;

export const PLANS: Record<PlanId, PlanFeatures> = {
  free: { label: 'Free', priceUsd: 0, activeBoards: 1, customSplits: false, adFree: false, liveScoring: false, autoManage: false },
  season: { label: 'Season Pass', priceUsd: 5.99, activeBoards: 25, customSplits: true, adFree: true, liveScoring: true, autoManage: true },
  admin: { label: 'Admin', priceUsd: 0, activeBoards: Number.POSITIVE_INFINITY, customSplits: true, adFree: true, liveScoring: true, autoManage: true }
};

export interface Entitlement {
  plan: PaidPlanId;
  expiresAt: number;
  updatedAt?: number;
}

export function isActive(entitlement: Entitlement | null | undefined, now = Date.now()): boolean {
  return !!entitlement && entitlement.expiresAt > now;
}

/** A pass that never expires is stored as a date far in the future, so every expiry check keeps working. */
export const NO_EXPIRY = Date.UTC(2100, 0, 1);

export function isNoExpiry(expiresAt: number | null | undefined): boolean {
  return typeof expiresAt === 'number' && expiresAt >= NO_EXPIRY;
}

/** Days left on a pass, or 0 when there is none to show (no pass, expired, or it never expires). */
export function daysLeft(entitlement: Entitlement | null | undefined, now = Date.now()): number {
  return isActive(entitlement, now) && !isNoExpiry(entitlement!.expiresAt)
    ? Math.ceil((entitlement!.expiresAt - now) / DAY_MS)
    : 0;
}

/** Per-quarter split in tenths of a percent (sums to 1000). */
export interface QuarterSplit { q1: number; q2: number; q3: number; q4: number }

export const DEFAULT_SPLIT: QuarterSplit = { q1: 200, q2: 200, q3: 200, q4: 400 };

export const SPLIT_PRESETS: { id: string; label: string; split: QuarterSplit }[] = [
  { id: 'classic', label: 'Classic', split: DEFAULT_SPLIT },
  { id: 'even', label: 'Even', split: { q1: 250, q2: 250, q3: 250, q4: 250 } },
  { id: 'half-heavy', label: 'Half heavy', split: { q1: 200, q2: 300, q3: 200, q4: 300 } },
  { id: 'escalating', label: 'Escalating', split: { q1: 150, q2: 200, q3: 250, q4: 400 } },
  { id: 'progressive', label: 'Progressive', split: { q1: 100, q2: 200, q3: 300, q4: 400 } },
  { id: 'half-final-only', label: 'Half & Final only', split: { q1: 0, q2: 500, q3: 0, q4: 500 } }
];

export function isValidSplit(split: QuarterSplit | null | undefined): split is QuarterSplit {
  if (!split) return false;
  const values = [split.q1, split.q2, split.q3, split.q4];
  return values.every(v => Number.isInteger(v) && v >= 0 && v <= 1000) && values.reduce((a, b) => a + b, 0) === 1000;
}

/** Split as fractions (0.2, 0.2, 0.2, 0.4) for the points math. */
export function splitFractions(split: QuarterSplit | null | undefined): { q1: number; q2: number; q3: number; q4: number } {
  const s = isValidSplit(split) ? split : DEFAULT_SPLIT;
  return { q1: s.q1 / 1000, q2: s.q2 / 1000, q3: s.q3 / 1000, q4: s.q4 / 1000 };
}

/**
 * What happens to a quarter's points when nobody holds the winning square.
 * final: they roll into Q4. If Q4 has no winner either, Q4's points are split among the other quarters.
 * redistribute: they are split among the other quarters in proportion to those quarters' shares.
 */
export type EmptyQuarterRule = 'final' | 'redistribute';

export const DEFAULT_EMPTY_QUARTER_RULE: EmptyQuarterRule = 'final';

export const EMPTY_QUARTER_RULES: { id: EmptyQuarterRule; label: string; description: string }[] = [
  {
    id: 'final',
    label: 'Roll to Q4',
    description: "An empty quarter's points go to Q4. If Q4 has no winner either, Q4's points are split among the other quarters."
  },
  {
    id: 'redistribute',
    label: 'Split across quarters',
    description: "An empty quarter's points are split among the other quarters, in proportion to their shares."
  }
];

export function isEmptyQuarterRule(value: unknown): value is EmptyQuarterRule {
  return value === 'final' || value === 'redistribute';
}

type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';
const QUARTER_KEYS: QuarterKey[] = ['q1', 'q2', 'q3', 'q4'];

/**
 * Each quarter's share of the board after empty quarters are settled.
 * `shares` are fractions (see splitFractions); `empty` marks quarters that are finished with no winner.
 * Quarters with a 0 share never receive points. Points with nowhere to go stay unawarded.
 */
export function effectiveQuarterShares(
  shares: { [k in QuarterKey]: number },
  empty: { [k in QuarterKey]: boolean },
  rule: EmptyQuarterRule | null | undefined
): { [k in QuarterKey]: number } {
  const out = { ...shares };
  const emptyKeys = QUARTER_KEYS.filter(k => empty[k] && shares[k] > 0);
  if (emptyKeys.length === 0) return out;

  const spread = (pool: number, among: QuarterKey[]): void => {
    const base = among.reduce((sum, k) => sum + shares[k], 0);
    if (base <= 0) return;
    for (const k of among) out[k] += pool * (shares[k] / base);
  };
  const live = (keys: QuarterKey[]): QuarterKey[] => keys.filter(k => !empty[k] && shares[k] > 0);

  if ((rule ?? DEFAULT_EMPTY_QUARTER_RULE) === 'final' && shares.q4 > 0) {
    const early = emptyKeys.filter(k => k !== 'q4');
    const pool = early.reduce((sum, k) => sum + shares[k], 0);
    early.forEach(k => (out[k] = 0));
    if (!empty.q4) {
      out.q4 += pool;
    } else {
      out.q4 = 0;
      spread(pool + shares.q4, live(['q1', 'q2', 'q3']));
    }
    return out;
  }

  const pool = emptyKeys.reduce((sum, k) => sum + shares[k], 0);
  emptyKeys.forEach(k => (out[k] = 0));
  spread(pool, live(QUARTER_KEYS));
  return out;
}

/**
 * Whole-number points per quarter. Each quarter rounds down, then the leftover points go to the
 * quarters with the biggest remainders (ties go to the later quarter), so the quarters add up to
 * the points actually awarded.
 */
export function quarterPoints(
  totalPot: number,
  shares: { [k in QuarterKey]: number }
): { [k in QuarterKey]: number } {
  const exact = QUARTER_KEYS.map(k => totalPot * shares[k]);
  const out = exact.map(v => Math.floor(v + 1e-9));
  const target = Math.round(exact.reduce((sum, v) => sum + v, 0));
  const byRemainder = QUARTER_KEYS.map((_, i) => i)
    .filter(i => shares[QUARTER_KEYS[i]] > 0)
    .sort((a, b) => (exact[b] - out[b]) - (exact[a] - out[a]) || b - a);
  let left = target - out.reduce((sum, v) => sum + v, 0);
  for (let n = 0; left > 0 && byRemainder.length > 0; n = (n + 1) % byRemainder.length, left--) {
    out[byRemainder[n]] += 1;
  }
  return { q1: out[0], q2: out[1], q3: out[2], q4: out[3] };
}
