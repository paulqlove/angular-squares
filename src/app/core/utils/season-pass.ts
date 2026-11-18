import { Entitlement, isActive, isNoExpiry } from '../plans';
import { SEASON_START_MONTH, seasonOf } from './season-games';

/** The pass's last day as a long month and day, 'June 30', read in UTC like the season itself. */
function lastDay(endsAt: number): string {
  return new Date(endsAt - 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** When the season that `now` falls in ends: the next July 1 (UTC), so it covers through June 30. */
function seasonEnd(now: number): number {
  return Date.UTC(Number(seasonOf(now)) + 1, SEASON_START_MONTH, 1);
}

/**
 * The last day of a Season Pass for "Good through June 30": the pass's own end date, or the current season's end
 * when there is no pass to read (the admin previewing Season Pass). Null for a pass that never ends.
 */
export function passLastDay(entitlement: Entitlement | null, now: number = Date.now()): string | null {
  if (!isActive(entitlement, now)) return lastDay(seasonEnd(now));
  return isNoExpiry(entitlement!.expiresAt) ? null : lastDay(entitlement!.expiresAt);
}
