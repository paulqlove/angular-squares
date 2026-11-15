import { isCoHostInvite, mayBeCoHostInvite, sameEmail } from './cohost-claim';

const dana = { uid: 'dana', email: 'dana@example.com', isGuest: false };
const invited = { ownerId: 'owner', managerEmail: 'Dana@Example.com' };

describe('isCoHostInvite', () => {
  it('is the signed-in person whose email the owner typed, ignoring case', () => {
    expect(isCoHostInvite(invited, dana)).toBe(true);
    expect(isCoHostInvite({ ...invited, managerId: '' }, dana)).toBe(true);
  });

  it('is nobody once the game has a co-host by uid, or when it has no email co-host', () => {
    expect(isCoHostInvite({ ...invited, managerId: 'dana' }, dana)).toBe(false);
    expect(isCoHostInvite({ ...invited, managerId: 'kim' }, dana)).toBe(false);
    expect(isCoHostInvite({ ownerId: 'owner' }, dana)).toBe(false);
    expect(isCoHostInvite({ ownerId: 'owner', managerEmail: '' }, dana)).toBe(false);
  });

  it('is never someone else, a guest, the signed-out viewer or the owner', () => {
    expect(isCoHostInvite(invited, { ...dana, email: 'eve@example.com' })).toBe(false);
    expect(isCoHostInvite(invited, { uid: 'g', email: null, isGuest: true })).toBe(false);
    expect(isCoHostInvite(invited, { ...dana, email: null })).toBe(false);
    expect(isCoHostInvite(invited, null)).toBe(false);
    expect(isCoHostInvite({ ...invited, ownerId: 'dana' }, dana)).toBe(false);
  });
});

describe('mayBeCoHostInvite', () => {
  it('is a signed-in, non-owner viewer with an email on a game with no co-host by uid: the only ones worth a read', () => {
    expect(mayBeCoHostInvite({ ownerId: 'owner' }, dana)).toBe(true);
    expect(mayBeCoHostInvite({ ownerId: 'owner', managerId: '' }, dana)).toBe(true);
    expect(mayBeCoHostInvite({ ownerId: 'owner', managerId: 'kim' }, dana)).toBe(false);
    expect(mayBeCoHostInvite({ ownerId: 'dana' }, dana)).toBe(false);
    expect(mayBeCoHostInvite({}, dana)).toBe(false);
    expect(mayBeCoHostInvite({ ownerId: 'owner' }, { uid: 'g', email: null, isGuest: true })).toBe(false);
    expect(mayBeCoHostInvite({ ownerId: 'owner' }, null)).toBe(false);
  });
});

describe('sameEmail', () => {
  it('ignores case only', () => {
    expect(sameEmail('A@B.co', 'a@b.co')).toBe(true);
    expect(sameEmail(' a@b.co', 'a@b.co')).toBe(false);
    expect(sameEmail('a.b@c.co', 'ab@c.co')).toBe(false);
  });
});
