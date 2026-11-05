import { isGameOver, quarterLabel } from './quarter-label';

describe('quarterLabel', () => {
    it('labels Q1 to Q3 the same whether or not the game is over', () => {
        for (const q of ['q1', 'q2', 'q3']) {
            expect(quarterLabel(q, false)).toBe(q.toUpperCase());
            expect(quarterLabel(q, true)).toBe(q.toUpperCase());
        }
    });

    it('calls the last tile Q4 while the game is in progress and Final once it is over', () => {
        expect(quarterLabel('q4', false)).toBe('Q4');
        expect(quarterLabel('q4', true)).toBe('Final');
    });
});

describe('isGameOver', () => {
    const running = { home: 7, away: 3 };

    it('does not treat a running Q4 total as final on a linked board', () => {
        expect(isGameOver({ espnEventId: '401', q4: running })).toBe(false);
        expect(isGameOver({ espnEventId: '401', espnLive: { completed: false }, linkedStatus: 'in', q4: running })).toBe(false);
    });

    it('is over on a linked board once ESPN says so', () => {
        expect(isGameOver({ espnEventId: '401', espnLive: { completed: true } })).toBe(true);
        expect(isGameOver({ espnEventId: '401', linkedStatus: 'post' })).toBe(true);
    });

    it('is over on a linked board once a Q4 winner is saved, even if ESPN is no longer asked', () => {
        expect(isGameOver({ espnEventId: '401', q4: running, q4Winner: 'Zachary Connolly' })).toBe(true);
        expect(isGameOver({ espnEventId: '401', q4: running, q4Winner: null })).toBe(false);
    });

    it('is over on a manual board once a Q4 score is entered', () => {
        expect(isGameOver({ q4: running })).toBe(true);
        expect(isGameOver({ q4: { home: 0, away: 0 } })).toBe(false);
        expect(isGameOver({})).toBe(false);
    });
});
