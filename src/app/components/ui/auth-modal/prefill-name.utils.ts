/**
 * What a sign-in name field shows as the dialog opens: the name typed on the board, trimmed. A field still holding the
 * last name filled in counts as untouched; anything else the player typed there stays.
 */
export function prefilledName(field: string, lastFilled: string, boardName: string): string {
  return field === lastFilled ? (boardName ?? '').trim() : field;
}
