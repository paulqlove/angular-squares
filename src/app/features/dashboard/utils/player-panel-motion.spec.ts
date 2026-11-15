import { phonePanelSlot, revealScroll } from './player-panel-motion';

describe('player panel motion', () => {
  describe('phonePanelSlot', () => {
    it('follows the right card of the open card’s row', () => {
      expect(phonePanelSlot(0, 6)).toBe(1);
      expect(phonePanelSlot(1, 6)).toBe(1);
      expect(phonePanelSlot(4, 6)).toBe(5);
    });

    it('gives both cards in a row the same slot, so a switch between them keeps one panel', () => {
      expect(phonePanelSlot(2, 6)).toBe(phonePanelSlot(3, 6));
      expect(phonePanelSlot(1, 6)).not.toBe(phonePanelSlot(2, 6));
    });

    it('follows a lone last card itself', () => {
      expect(phonePanelSlot(4, 5)).toBe(4);
      expect(phonePanelSlot(0, 1)).toBe(0);
    });

    it('has no slot when no card in the group is open', () => {
      expect(phonePanelSlot(-1, 6)).toBe(-1);
      expect(phonePanelSlot(6, 6)).toBe(-1);
    });
  });

  describe('revealScroll', () => {
    const screen = { top: 0, bottom: 700 };

    it('never scrolls when the panel is already in view', () => {
      expect(revealScroll({ top: 100, bottom: 700 }, screen)).toBe(0);
      expect(revealScroll({ top: 0, bottom: 300 }, screen)).toBe(0);
    });

    it('scrolls down just far enough to show the bottom', () => {
      expect(revealScroll({ top: 400, bottom: 860 }, screen)).toBe(160);
    });

    it('lines the top up when the panel is taller than the visible part', () => {
      expect(revealScroll({ top: 300, bottom: 1200 }, screen)).toBe(300);
    });

    it('scrolls up when the panel starts above the visible part', () => {
      expect(revealScroll({ top: -50, bottom: 200 }, { top: 0, bottom: 700 })).toBe(-50);
    });

    it('counts the bottom bar as covering the screen', () => {
      // The bar's top at 620px: a panel ending at 650px is under it
      expect(revealScroll({ top: 400, bottom: 650 }, { top: 0, bottom: 620 })).toBe(30);
    });
  });
});
