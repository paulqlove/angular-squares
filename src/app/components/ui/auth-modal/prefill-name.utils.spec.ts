import { prefilledName } from './prefill-name.utils';

describe('prefilledName', () => {
  it('fills an untouched field with the name typed on the board, trimmed', () => {
    expect(prefilledName('', '', '  Paul ')).toBe('Paul');
  });

  it('leaves the field blank when nothing was typed on the board', () => {
    expect(prefilledName('', '', '')).toBe('');
    expect(prefilledName('', '', '   ')).toBe('');
  });

  it('never overwrites a name the player typed in the field', () => {
    expect(prefilledName('Paulie', 'Paul', 'Paul Love')).toBe('Paulie');
    expect(prefilledName('Ann', '', 'Paul')).toBe('Ann');
  });

  it('follows a changed board name while the field still holds the last name filled in', () => {
    expect(prefilledName('Paul', 'Paul', 'Paula')).toBe('Paula');
    expect(prefilledName('Paul', 'Paul', '')).toBe('');
  });
});
