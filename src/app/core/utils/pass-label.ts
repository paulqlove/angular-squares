import { DAY_MS, isNoExpiry } from '../plans';

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
