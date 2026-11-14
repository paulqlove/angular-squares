import { GameListItem } from '../../../core/services/game.service';
import { formatPassExpiry } from './dashboard-admin.service';
import { autoLockText, canLockFromCard, hasCardBar, isBoardQuiet, openCount } from './board-card';

function board(extra: Partial<GameListItem> = {}): GameListItem {
  return { id: 'ABC123', name: 'Board', ownerName: 'Paul', createdAt: 0, playerCount: 0, squaresFilled: 0, isLocked: false, isRandomized: false, pricePerSquare: 10, boardSize: 100, ...extra } as GameListItem;
}

describe('board card', () => {
  it('counts the open squares, never below zero', () => {
    expect(openCount(board({ squaresFilled: 42 }))).toBe(58);
    expect(openCount(board({ boardSize: 25, squaresFilled: 7 }))).toBe(18);
    expect(openCount(board({ boardSize: 25, squaresFilled: 30 }))).toBe(0);
  });

  it('goes quiet once a board is full or locked', () => {
    expect(isBoardQuiet(board({ squaresFilled: 50 }))).toBe(false);
    expect(isBoardQuiet(board({ squaresFilled: 100 }))).toBe(true);
    expect(isBoardQuiet(board({ squaresFilled: 3, isLocked: true }))).toBe(true);
  });

  it('offers Lock now to the host of a full open board only', () => {
    const full = board({ squaresFilled: 100 });
    expect(canLockFromCard(full, false)).toBe(true);
    expect(canLockFromCard(full, true)).toBe(false);
    expect(canLockFromCard(board({ squaresFilled: 100, isLocked: true }), false)).toBe(false);
  });

  it('gives filling boards and ready-to-lock boards a bottom bar', () => {
    expect(hasCardBar(board({ squaresFilled: 10 }), true)).toBe(true);
    expect(hasCardBar(board({ squaresFilled: 100 }), false)).toBe(true);
    expect(hasCardBar(board({ squaresFilled: 100 }), true)).toBe(false);
    expect(hasCardBar(board({ squaresFilled: 100, isLocked: true }), false)).toBe(false);
  });

  it('has no auto-lock text without Auto-lock and draw', () => {
    expect(autoLockText(board({ squaresFilled: 100 }))).toBe('');
  });
});

describe('formatPassExpiry', () => {
  const now = 1_700_000_000_000;
  it('counts the days left, and says when a pass has run out', () => {
    expect(formatPassExpiry(now + 86_400_000, now)).toBe('1 day left');
    expect(formatPassExpiry(now + 3 * 86_400_000 - 1000, now)).toBe('3 days left');
    expect(formatPassExpiry(now - 1, now)).toBe('Expired');
  });
});
