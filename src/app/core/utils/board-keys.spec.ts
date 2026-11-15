import { boardArrowStep } from './board-keys';

const key = (k: string): KeyboardEvent => new KeyboardEvent('keydown', { key: k });

describe('boardArrowStep', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('steps left and right on the arrow keys', () => {
    expect(boardArrowStep(key('ArrowLeft'))).toBe(-1);
    expect(boardArrowStep(key('ArrowRight'))).toBe(1);
    expect(boardArrowStep(key('Enter'))).toBe(0);
  });

  it('ignores the arrows while a menu or dialog is open', () => {
    document.body.innerHTML = '<div role="menu"></div>';
    expect(boardArrowStep(key('ArrowRight'))).toBe(0);
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(boardArrowStep(key('ArrowLeft'))).toBe(0);
  });
});
