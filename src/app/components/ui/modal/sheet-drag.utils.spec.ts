import { backdropOpacity, canDragFrom, flickVelocity, isTap, scaleAlpha, sheetOffset, shouldClose } from './sheet-drag.utils';

describe('sheet-drag utils', () => {
  describe('sheetOffset', () => {
    it('follows the finger 1:1 going down', () => {
      expect(sheetOffset(0)).toBe(0);
      expect(sheetOffset(120)).toBe(120);
    });

    it('gives a fifth of the distance going up past the top', () => {
      expect(sheetOffset(-100)).toBeCloseTo(-20);
    });
  });

  describe('shouldClose', () => {
    it('closes past 30% of the sheet height', () => {
      expect(shouldClose(121, 400, 0)).toBe(true);
      expect(shouldClose(120, 400, 0)).toBe(false);
    });

    it('closes on a downward flick faster than 0.5px/ms, however short', () => {
      expect(shouldClose(20, 400, 0.6)).toBe(true);
      expect(shouldClose(20, 400, 0.5)).toBe(false);
    });

    it('never closes on an upward flick', () => {
      expect(shouldClose(-10, 400, -2)).toBe(false);
    });
  });

  describe('flickVelocity', () => {
    it('is 0 with fewer than two samples', () => {
      expect(flickVelocity([])).toBe(0);
      expect(flickVelocity([{ y: 10, t: 0 }])).toBe(0);
    });

    it('measures only the last 100ms of movement', () => {
      const slowThenFast = [{ y: 0, t: 0 }, { y: 5, t: 400 }, { y: 10, t: 450 }, { y: 70, t: 500 }];
      expect(flickVelocity(slowThenFast)).toBeCloseTo(65 / 100);
    });

    it('is negative when the finger moves up', () => {
      expect(flickVelocity([{ y: 100, t: 0 }, { y: 50, t: 50 }])).toBeCloseTo(-1);
    });
  });

  describe('backdropOpacity', () => {
    it('is full at rest and when dragged up', () => {
      expect(backdropOpacity(0, 400)).toBe(1);
      expect(backdropOpacity(-20, 400)).toBe(1);
    });

    it('falls to 40% at the close point and stays there', () => {
      expect(backdropOpacity(60, 400)).toBeCloseTo(0.7);
      expect(backdropOpacity(120, 400)).toBeCloseTo(0.4);
      expect(backdropOpacity(300, 400)).toBeCloseTo(0.4);
    });
  });

  describe('canDragFrom', () => {
    it('drags either way from the grabber or header, where nothing scrolls', () => {
      expect(canDragFrom([], 12)).toBe(true);
      expect(canDragFrom([], -12)).toBe(true);
    });

    it('drags down from a body scrolled to its top', () => {
      expect(canDragFrom([0], 12)).toBe(true);
    });

    it('leaves the body to scroll when it is scrolled down or the finger moves up', () => {
      expect(canDragFrom([40], 12)).toBe(false);
      expect(canDragFrom([0, 8], 12)).toBe(false);
      expect(canDragFrom([0], -12)).toBe(false);
    });
  });

  describe('isTap', () => {
    it('counts a press that moved 10px or less as a tap', () => {
      expect(isTap(0, 0)).toBe(true);
      expect(isTap(6, 8)).toBe(true);
    });

    it('does not count a press that moved more than 10px', () => {
      expect(isTap(0, 11)).toBe(false);
      expect(isTap(8, 8)).toBe(false);
    });
  });

  describe('scaleAlpha', () => {
    it('scales the alpha of an rgba colour', () => {
      expect(scaleAlpha('rgba(0, 0, 0, 0.6)', 0.5)).toBe('rgba(0, 0, 0, 0.3)');
    });

    it('treats an rgb colour as fully opaque', () => {
      expect(scaleAlpha('rgb(10, 20, 30)', 0.4)).toBe('rgba(10, 20, 30, 0.4)');
    });

    it('leaves anything else alone', () => {
      expect(scaleAlpha('transparent', 0.4)).toBe('transparent');
    });
  });
});
