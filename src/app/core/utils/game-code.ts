/** Game codes are six letters and digits, shown upper-cased. */
export const GAME_CODE_LENGTH = 6;

/**
 * A code as people paste or type it, made into the form the site uses: letters and digits only, upper-cased, then cut
 * to six. Spaces and dashes go before the cut, so a pasted "abc-123" becomes "ABC123", not "ABC-12".
 */
export function normalizeGameCode(text: string | null | undefined): string {
  return (text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, GAME_CODE_LENGTH);
}

/** True for a whole code: exactly six letters and digits. */
export function isGameCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * For a code field: puts the clean code back in the field as the person types or pastes, keeping the caret where
 * they were typing, and returns it.
 */
export function normalizeCodeInput(input: HTMLInputElement): string {
  const raw = input.value;
  const code = normalizeGameCode(raw);
  if (raw !== code) {
    const caret = normalizeGameCode(raw.slice(0, input.selectionStart ?? raw.length)).length;
    input.value = code;
    try { input.setSelectionRange(caret, caret); } catch { /* not every input type supports a selection */ }
  }
  return code;
}

/**
 * Asks the database whether a game with this code exists, without loading the Firebase SDK, so the landing page stays
 * light. A shallow REST read returns `true` for an existing game and `null` for none. Resolves true when the check
 * itself fails (offline, blocked), so the person still goes to the game page rather than being told it isn't there.
 */
export async function gameCodeExists(code: string, databaseURL: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchFn(`${databaseURL}/games/${encodeURIComponent(code)}.json?shallow=true`);
    if (!response.ok) return true;
    return (await response.json()) !== null;
  } catch {
    return true;
  }
}
