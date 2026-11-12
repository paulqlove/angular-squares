import { isGameCode, normalizeCodeInput, normalizeGameCode } from './game-code';

describe('normalizeGameCode', () => {
  it('drops spaces and dashes before cutting to six', () => {
    expect(normalizeGameCode('ABC-123')).toBe('ABC123');
    expect(normalizeGameCode(' abc 123 ')).toBe('ABC123');
    expect(normalizeGameCode('k7p2qx9')).toBe('K7P2QX');
  });

  it('handles empty input', () => {
    expect(normalizeGameCode('')).toBe('');
    expect(normalizeGameCode(null)).toBe('');
  });
});

describe('isGameCode', () => {
  it('takes exactly six capital letters and digits', () => {
    expect(isGameCode('ABC123')).toBe(true);
    expect(isGameCode('ABC12')).toBe(false);
    expect(isGameCode('abc123')).toBe(false);
  });
});

describe('normalizeCodeInput', () => {
  it('writes the clean code back into a field holding a pasted code', () => {
    const input = document.createElement('input');
    input.value = 'abc-123';
    expect(normalizeCodeInput(input)).toBe('ABC123');
    expect(input.value).toBe('ABC123');
  });

  it('keeps a seventh character out of the field', () => {
    const input = document.createElement('input');
    input.value = 'ABC1234';
    expect(normalizeCodeInput(input)).toBe('ABC123');
    expect(input.value).toBe('ABC123');
  });
});
