/**
 * The toast after Copy TV link on a rotation. With a group (Creative's tv-group spec): "TV link copied: Work, 4 boards,
 * 10s each." The TV follows the group, so nothing more to say. Under All groups the TV keeps the boards it was given,
 * so the toast says to press it again after changes.
 */
export function tvLinkCopiedMessage(groupName: string | null, boards: number, seconds: number): string {
  const what = `${boards} ${boards === 1 ? 'board' : 'boards'}, ${seconds}s each`;
  return groupName ? `TV link copied: ${groupName}, ${what}.` : `TV link copied: ${what}. Press it again after you change boards or the time.`;
}
