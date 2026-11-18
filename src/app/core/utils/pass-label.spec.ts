import { DAY_MS, NO_EXPIRY } from '../plans';
import { passGoodThrough } from './pass-label';

const NOW = Date.UTC(2026, 10, 18, 3, 0);
const CENTRAL = 'America/Chicago';

describe('passGoodThrough', () => {
  it('shows June 30 for a paid pass, which ends at 00:00 UTC on July 1', () => {
    expect(passGoodThrough(Date.UTC(2027, 6, 1), NOW, CENTRAL)).toBe('Good through June 30');
    expect(passGoodThrough(Date.UTC(2027, 6, 1), NOW, 'UTC')).toBe('Good through June 30');
  });

  it('shows the last full day of a gifted pass in the device time zone', () => {
    // Ends 03:00 UTC on Dec 18, which is 9 PM on Dec 17 in Dallas.
    expect(passGoodThrough(NOW + 30 * DAY_MS, NOW, CENTRAL)).toBe('Good through December 17');
  });

  it('adds the year only when the pass runs more than a year out', () => {
    expect(passGoodThrough(Date.UTC(2028, 6, 1), NOW, CENTRAL)).toBe('Good through June 30, 2028');
  });

  it('says a pass that never expires never expires', () => {
    expect(passGoodThrough(NO_EXPIRY, NOW, CENTRAL)).toBe('Never expires');
  });
});
