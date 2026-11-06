import { buildFirstTouch } from './first-touch';

describe('buildFirstTouch', () => {
  it('keeps the referrer host, not the full URL', () => {
    const t = buildFirstTouch('https://quarterscore.com/team/chiefs', 'https://www.google.com/search?q=squares', 5);
    expect(t).toEqual({ at: 5, path: '/team/chiefs', ref: 'google.com' });
  });

  it('treats same-site referrers and empty referrers as direct', () => {
    expect(buildFirstTouch('https://quarterscore.com/', 'https://quarterscore.com/x', 1).ref).toBeUndefined();
    expect(buildFirstTouch('https://quarterscore.com/', '', 1).ref).toBeUndefined();
  });

  it('reads and cleans utm tags', () => {
    const t = buildFirstTouch('https://quarterscore.com/?utm_source=Facebook&utm_medium=social<script>&utm_campaign=sb61', '', 1);
    expect(t.src).toBe('facebook');
    expect(t.med).toBe('socialscript');
    expect(t.camp).toBe('sb61');
  });
});
