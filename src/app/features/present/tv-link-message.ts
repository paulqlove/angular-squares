/**
 * The toast after Copy TV link on a rotation. With a group: "TV link copied: Work, 4 boards, 10s each." The TV follows
 * the group's boards, but a new time still needs the link copied again. Under All groups the TV keeps the boards it was
 * given, so the toast says to press it again after either changes.
 */
export function tvLinkCopiedMessage(groupName: string | null, boards: number, seconds: number): string {
  const what = `${boards} ${boards === 1 ? 'board' : 'boards'}, ${seconds}s each`;
  if (groupName) return `TV link copied: ${groupName}, ${what}. Press it again after you change the time.`;
  return `TV link copied: ${what}. Press it again after you change boards or the time.`;
}
