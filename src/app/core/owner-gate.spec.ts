import { canViewLegacyMoney, ownerEntryPath } from './owner-gate';

describe('canViewLegacyMoney', () => {
  const creator = 'creator-uid';

  it('allows the creator only when their own owners entry is exactly true', () => {
    expect(canViewLegacyMoney({
      currentUid: creator,
      gameCreatorUid: creator,
      ownOwnerFlag: true
    })).toBeTrue();
  });

  it('rejects a missing user, a missing creator, and a mismatched creator', () => {
    expect(canViewLegacyMoney({
      currentUid: null,
      gameCreatorUid: creator,
      ownOwnerFlag: true
    })).toBeFalse();
    expect(canViewLegacyMoney({
      currentUid: '',
      gameCreatorUid: creator,
      ownOwnerFlag: true
    })).toBeFalse();
    expect(canViewLegacyMoney({
      currentUid: creator,
      gameCreatorUid: null,
      ownOwnerFlag: true
    })).toBeFalse();
    expect(canViewLegacyMoney({
      currentUid: 'someone-else',
      gameCreatorUid: creator,
      ownOwnerFlag: true
    })).toBeFalse();
  });

  it('rejects every flag value other than boolean true', () => {
    const flags: unknown[] = [false, null, undefined, 'true', 1, 'yes', {}, []];
    for (const ownOwnerFlag of flags) {
      expect(canViewLegacyMoney({
        currentUid: creator,
        gameCreatorUid: creator,
        ownOwnerFlag
      })).toBeFalse();
    }
  });

  it('uses the same rule for every uid', () => {
    for (const uid of ['user-a', 'user-b', 'owner-3']) {
      expect(canViewLegacyMoney({
        currentUid: uid,
        gameCreatorUid: uid,
        ownOwnerFlag: true
      })).toBeTrue();
      expect(canViewLegacyMoney({
        currentUid: uid,
        gameCreatorUid: 'other-person',
        ownOwnerFlag: true
      })).toBeFalse();
    }
  });
});

describe('ownerEntryPath', () => {
  it('reads only the signed-in user entry', () => {
    expect(ownerEntryPath('abc123')).toBe('owners/abc123');
    expect(ownerEntryPath('abc123').split('/')).toEqual(['owners', 'abc123']);
  });
});
