import { ArrivalTracker, NO_SQUARE_CHANGES, squareChanges } from './square-motion.utils';

describe('squareChanges', () => {
  it('returns null when no square changed hands', () => {
    expect(squareChanges({ '1-1': 'Ana' }, { '1-1': 'Ana' }, '1-1')).toBeNull();
  });

  it('marks the tapped square as the viewer’s own claim and the rest as someone else’s', () => {
    const changes = squareChanges({}, { '1-1': 'Ana', '2-2': 'Dev' }, '1-1')!;
    expect([...changes.own]).toEqual(['1-1']);
    expect([...changes.others]).toEqual(['2-2']);
    expect(changes.released.size).toBe(0);
  });

  it('marks a square that was let go', () => {
    const changes = squareChanges({ '3-4': 'Ana' }, {}, '3-4')!;
    expect([...changes.released]).toEqual(['3-4']);
    expect(changes.own.size).toBe(0);
  });

  it('animates nothing when more than three squares change at once (a load or a board switch)', () => {
    const next = { '0-0': 'A', '0-1': 'B', '0-2': 'C', '0-3': 'D' };
    expect(squareChanges({}, next, null)).toBe(NO_SQUARE_CHANGES);
  });
});

describe('ArrivalTracker', () => {
  it('gives nothing new on the first look at a board', () => {
    expect(new ArrivalTracker().next('a', ['q1'])).toEqual([]);
  });

  it('gives the keys that arrive while the same board is on screen', () => {
    const tracker = new ArrivalTracker();
    tracker.next('a', ['q1']);
    expect(tracker.next('a', ['q1', 'q2'])).toEqual(['q2']);
  });

  it('returns null when the keys are the same, so a running animation is left alone', () => {
    const tracker = new ArrivalTracker();
    tracker.next('a', ['q1']);
    tracker.next('a', ['q1', 'q2']);
    expect(tracker.next('a', ['q2', 'q1'])).toBeNull();
  });

  it('treats a square that won two quarters as one key', () => {
    const tracker = new ArrivalTracker();
    tracker.next('a', ['1-1']);
    expect(tracker.next('a', ['1-1', '1-1'])).toBeNull();
    expect(tracker.next('a', ['1-1', '1-1', '2-2'])).toEqual(['2-2']);
    expect(tracker.next('a', ['1-1', '1-1', '2-2'])).toBeNull();
  });

  it('gives nothing new after a switch to another board', () => {
    const tracker = new ArrivalTracker();
    tracker.next('a', ['q1']);
    expect(tracker.next('b', ['q1', 'q2', 'q3'])).toEqual([]);
  });
});
