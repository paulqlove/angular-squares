import { DAY_MS, Entitlement, isActive, isNoExpiry } from '../plans';

/**
 * The profile menu's Season Pass line: "Good through June 30", or "Never expires".
 * A pass ends at its expiresAt (a paid pass at 00:00 UTC on July 1), so the last good day is the one just before it.
 * The year shows only when the pass runs more than a year out. timeZone is for tests; the app uses the device's.
 */
export function passGoodThrough(expiresAt: number, now: number = Date.now(), timeZone?: string): string {
  if (isNoExpiry(expiresAt)) return 'Never expires';
  const lastDay = new Date(expiresAt - 1);
  const withYear = expiresAt - now > 365 * DAY_MS;
  const date = lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: withYear ? 'numeric' : undefined, timeZone });
  return `Good through ${date}`;
}

/** Who is looking at the menu: an admin, or an admin previewing another plan, sees no pass of their own. */
export interface PassViewer { admin: boolean; previewing: boolean }

/**
 * The profile menu's Season Pass line for a host's own pass, or null when the menu shows no Season Pass section:
 * no pass, a pass that has ended by now, an admin account, or an admin previewing a plan.
 */
export function ownPassLabel(entitlement: Entitlement | null, viewer: PassViewer, now: number = Date.now(), timeZone?: string): string | null {
  if (viewer.admin || viewer.previewing || !isActive(entitlement, now)) return null;
  return passGoodThrough(entitlement!.expiresAt, now, timeZone);
}
