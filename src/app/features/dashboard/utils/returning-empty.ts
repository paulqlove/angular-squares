import { SEASON_LIMIT_ON, seasonLimitApplies } from '../../../core/utils/season-games';

/** What the dashboard knows when it picks the Hosting empty state. */
export interface EmptyDashboardFacts {
  /** Boards the host has right now. */
  boards: number;
  /** Free games a season on the host's plan: 3 on Free, unlimited on Season Pass and Admin. */
  cap: number;
  /** Signed in and not a guest. */
  canHost: boolean;
  loading: boolean;
  /** Games counted this season, or null until read (or when the read failed). */
  used: number | null;
}

/**
 * True for a returning free host: no boards right now, but at least one game already counted this season.
 * A first-time host (nothing counted yet), a Season Pass or Admin host, and the season cap switched off all keep the first-board screen.
 */
export function isReturningEmpty(facts: EmptyDashboardFacts, on: boolean = SEASON_LIMIT_ON): boolean {
  return facts.canHost && !facts.loading && facts.boards === 0 && seasonLimitApplies(facts.cap, on) && (facts.used ?? 0) > 0;
}
