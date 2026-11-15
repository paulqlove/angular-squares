/**
 * The toast after Copy TV link on a rotation: "TV link copied: Work, 4 boards, 10s each." with the group's name, or
 * without one under All groups. The TV keeps the boards it was given, so the toast says to press it again after changes.
 */
export function tvLinkCopiedMessage(groupName: string | null, boards: number, seconds: number): string {
  const what = `${boards} ${boards === 1 ? 'board' : 'boards'}, ${seconds}s each`;
  return `TV link copied: ${groupName ? `${groupName}, ` : ''}${what}. Press it again after you change boards or the time.`;
}
