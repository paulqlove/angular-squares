export interface LegacyMoneyAccess {
  currentUid: string | null | undefined;
  gameCreatorUid: string | null | undefined;
  /**
   * Value of owners/{currentUid}. Clients can read only their own entry,
   * so this is never another person's flag.
   */
  ownOwnerFlag: unknown;
}

/**
 * Legacy amount tracking is visible only when the signed-in user is the
 * game creator and owners/{uid} is exactly true.
 */
export function canViewLegacyMoney(access: LegacyMoneyAccess): boolean {
  const currentUid = access.currentUid;
  const gameCreatorUid = access.gameCreatorUid;
  if (!currentUid || !gameCreatorUid) {
    return false;
  }
  if (currentUid !== gameCreatorUid) {
    return false;
  }
  return access.ownOwnerFlag === true;
}

/** RTDB path for the signed-in user's allowlist entry. */
export function ownerEntryPath(uid: string): string {
  return `owners/${uid}`;
}
