import { FREE_ACTIVE_BOARD_LIMIT, NOTIFY_EMAIL_PATTERN, UNLINKED_BOARD_ACTIVE_MS, isBoardActive, isEspnStatusFinal } from './board-activity';

describe('isBoardActive', () => {
    const now = Date.UTC(2026, 10, 1, 18, 0, 0);

    it('allows one free active board', () => {
        expect(FREE_ACTIVE_BOARD_LIMIT).toBe(1);
    });

    it('keeps an unlinked board active until 48 hours have passed', () => {
        expect(isBoardActive({
            createdAt: now - UNLINKED_BOARD_ACTIVE_MS + 1,
            linkedGameFinal: null
        }, now)).toBe(true);
        expect(isBoardActive({
            createdAt: now - UNLINKED_BOARD_ACTIVE_MS,
            linkedGameFinal: null
        }, now)).toBe(false);
        expect(isBoardActive({
            createdAt: now - UNLINKED_BOARD_ACTIVE_MS - 1,
            linkedGameFinal: null
        }, now)).toBe(false);
    });

    it('keeps a board with no createdAt active', () => {
        expect(isBoardActive({ createdAt: null, linkedGameFinal: null }, now)).toBe(true);
    });

    it('keeps a linked board active until the game is confirmed final', () => {
        expect(isBoardActive({
            createdAt: now - UNLINKED_BOARD_ACTIVE_MS - 1,
            espnEventId: '401547417',
            linkedGameFinal: false
        }, now)).toBe(true);
        expect(isBoardActive({
            createdAt: now,
            espnEventId: '401547417',
            linkedGameFinal: null
        }, now)).toBe(true);
        expect(isBoardActive({
            createdAt: now,
            espnEventId: '401547417',
            linkedGameFinal: true
        }, now)).toBe(false);
    });

    it('treats a blank link as an unlinked board', () => {
        expect(isBoardActive({
            createdAt: now - UNLINKED_BOARD_ACTIVE_MS - 1,
            espnEventId: '   ',
            linkedGameFinal: false
        }, now)).toBe(false);
    });
});

describe('isEspnStatusFinal', () => {
    it('recognizes a final game and leaves other states active', () => {
        expect(isEspnStatusFinal({ name: 'STATUS_FINAL', state: 'post', completed: true })).toBe(true);
        expect(isEspnStatusFinal({ name: 'STATUS_FINAL_OVERTIME', state: 'post', completed: true })).toBe(true);
        expect(isEspnStatusFinal({ name: 'STATUS_IN_PROGRESS', state: 'in', completed: false })).toBe(false);
        expect(isEspnStatusFinal({ name: 'STATUS_SCHEDULED', state: 'pre', completed: false })).toBe(false);
        expect(isEspnStatusFinal({ name: 'STATUS_POSTPONED', state: 'post', completed: true })).toBe(false);
        expect(isEspnStatusFinal({ name: 'STATUS_CANCELED', state: 'post', completed: true })).toBe(false);
        expect(isEspnStatusFinal(null)).toBeNull();
        expect(isEspnStatusFinal({ name: 'STATUS_UNKNOWN' })).toBeNull();
    });
});

describe('NOTIFY_EMAIL_PATTERN', () => {
    it('accepts a normal address and rejects empty or oversized lookalikes', () => {
        expect(NOTIFY_EMAIL_PATTERN.test('host@example.com')).toBe(true);
        expect(NOTIFY_EMAIL_PATTERN.test('a.b+c@sub.example.co')).toBe(true);
        expect(NOTIFY_EMAIL_PATTERN.test('not-an-email')).toBe(false);
        expect(NOTIFY_EMAIL_PATTERN.test('a@b')).toBe(false);
        expect(NOTIFY_EMAIL_PATTERN.test('a@b.c')).toBe(false);
        expect(NOTIFY_EMAIL_PATTERN.test('')).toBe(false);
    });
});
