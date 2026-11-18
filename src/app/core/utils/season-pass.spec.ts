import { NO_EXPIRY } from '../plans';
import { passLastDay } from './season-pass';

describe('passLastDay', () => {
  const nov2026 = Date.UTC(2026, 10, 18);

  it('names the day before the pass ends, so a July 1 end reads June 30', () => {
    expect(passLastDay({ plan: 'season', expiresAt: Date.UTC(2027, 6, 1) }, nov2026)).toBe('June 30');
  });

  it('reads a gifted pass with another end date as its own last day', () => {
    expect(passLastDay({ plan: 'season', expiresAt: Date.UTC(2027, 1, 15) }, nov2026)).toBe('February 14');
  });

  it('falls back to the season end with no running pass', () => {
    expect(passLastDay(null, nov2026)).toBe('June 30');
    expect(passLastDay({ plan: 'season', expiresAt: nov2026 - 1 }, nov2026)).toBe('June 30');
  });

  it('has no last day for a pass that never ends', () => {
    expect(passLastDay({ plan: 'season', expiresAt: NO_EXPIRY }, nov2026)).toBeNull();
  });
});
