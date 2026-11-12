import { gameCodeExists, isGameCode, normalizeCodeInput, normalizeGameCode } from './game-code';

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

describe('gameCodeExists', () => {
  const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it('reads the game shallowly and is true only when it exists', async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => { calls.push(url); return { ok: true, json: async () => true }; }) as unknown as typeof fetch;
    expect(await gameCodeExists('ABC123', 'https://db.example', fetchFn)).toBe(true);
    expect(calls).toEqual(['https://db.example/games/ABC123.json?shallow=true']);
    expect(await gameCodeExists('ZZZ999', 'https://db.example', reply(null))).toBe(false);
  });

  it('lets the person through when the check itself fails', async () => {
    expect(await gameCodeExists('ABC123', 'https://db.example', reply(null, false))).toBe(true);
    const offline = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await gameCodeExists('ABC123', 'https://db.example', offline)).toBe(true);
  });
});
