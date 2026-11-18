import { hostNextStep } from './host-next-step';

describe('hostNextStep', () => {
  it('locks an open board, drawn or not', () => {
    expect(hostNextStep(false, false)).toBe('lock');
    expect(hostNextStep(false, true)).toBe('lock');
  });

  it('draws on a board locked without numbers', () => {
    expect(hostNextStep(true, false)).toBe('draw');
  });

  it('unlocks once the numbers are drawn', () => {
    expect(hostNextStep(true, true)).toBe('unlock');
  });
});
