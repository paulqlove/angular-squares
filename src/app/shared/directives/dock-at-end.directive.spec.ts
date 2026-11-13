import { nextDocked } from './dock-at-end.directive';

describe('nextDocked', () => {
  // A 2000px page on an 800px screen: the end is at scrollY 1200
  it('docks at the end of the page', () => {
    expect(nextDocked(false, 1200, 800, 2000)).toBe(true);
    expect(nextDocked(false, 1198, 800, 2000)).toBe(true);
    expect(nextDocked(false, 1190, 800, 2000)).toBe(false);
  });

  it('stays docked until the page is scrolled 24px back up', () => {
    expect(nextDocked(true, 1190, 800, 2000)).toBe(true);
    expect(nextDocked(true, 1177, 800, 2000)).toBe(true);
    expect(nextDocked(true, 1176, 800, 2000)).toBe(false);
  });

  it('never docks on a page too short to scroll', () => {
    expect(nextDocked(false, 0, 800, 800)).toBe(false);
    expect(nextDocked(true, 0, 800, 801)).toBe(false);
  });
});
