import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { CoHostClaimService } from './cohost-claim.service';
import { GameDatabaseService } from './game-database.service';
import { ToastService } from './toast.service';
import { UserGamesService } from './user-games.service';

const invited = { ownerId: 'owner', name: 'Office Pool' };
const both = { 'games/game02/managerId': 'dana', 'coHosts/owner/dana': 'game02' };
const roleOnly = { 'games/game02/managerId': 'dana' };

describe('CoHostClaimService', () => {
  let service: CoHostClaimService;
  let patch: ReturnType<typeof vi.fn>;
  let readInvite: ReturnType<typeof vi.fn>;
  let user: { uid: string; email: string | null; isGuest: boolean } | null;
  let role: string;
  const warning = vi.fn();
  const addJoinedGame = vi.fn();

  beforeEach(() => {
    user = { uid: 'dana', email: 'dana@example.com', isGuest: false };
    role = 'actual';
    warning.mockReset();
    addJoinedGame.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: GameDatabaseService, useValue: { isBrowser: true } },
        { provide: AuthService, useValue: { currentUser: () => user, previewRole: () => role } },
        { provide: ToastService, useValue: { warning } },
        { provide: UserGamesService, useValue: { addJoinedGame } }
      ]
    });
    service = TestBed.inject(CoHostClaimService);
    patch = vi.fn().mockResolvedValue(undefined);
    readInvite = vi.fn().mockResolvedValue('Dana@Example.com');
    Object.assign(service as unknown as object, { patch, readInvite });
  });

  it('writes the email co-host\'s uid as the co-host and their mark in one write, then lists the game', async () => {
    await service.claimIfInvited('game02', invited);
    expect(readInvite).toHaveBeenCalledWith('owner', 'game02');
    expect(patch.mock.calls).toEqual([[both]]);
    expect(addJoinedGame).toHaveBeenCalledWith('dana', 'game02', 'Office Pool');
    expect(warning).not.toHaveBeenCalled();
  });

  it('saves the role alone when the mark is refused (the owner already marked them)', async () => {
    patch.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    await service.claimIfInvited('game02', invited);
    expect(patch.mock.calls).toEqual([[both], [roleOnly]]);
    expect(addJoinedGame).toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  });

  it('does nothing for anyone else, or while previewing a role', async () => {
    readInvite.mockResolvedValue(null);
    user = { uid: 'eve', email: 'eve@example.com', isGuest: false };
    await service.claimIfInvited('game02', invited);
    readInvite.mockResolvedValue('Dana@Example.com');
    user = { uid: 'dana', email: 'dana@example.com', isGuest: false };
    await service.claimIfInvited('game03', { ...invited, managerId: 'kim' });
    role = 'player';
    await service.claimIfInvited('game04', invited);
    expect(patch).not.toHaveBeenCalled();
  });

  it('reads the hidden email only for a signed-in viewer who could be the co-host, once per game and person', async () => {
    user = { uid: 'g', email: null, isGuest: true };
    await service.claimIfInvited('game02', invited);
    user = { uid: 'owner', email: 'owner@example.com', isGuest: false };
    await service.claimIfInvited('game02', invited);
    expect(readInvite).not.toHaveBeenCalled();
    user = { uid: 'eve', email: 'eve@example.com', isGuest: false };
    readInvite.mockResolvedValue(null);
    await service.claimIfInvited('game02', invited);
    await service.claimIfInvited('game02', invited);
    expect(readInvite).toHaveBeenCalledTimes(1);
    user = { uid: 'dana', email: 'dana@example.com', isGuest: false };
    readInvite.mockResolvedValue('Dana@Example.com');
    await service.claimIfInvited('game02', invited);
    expect(patch.mock.calls).toEqual([[both]]);
  });

  it('tries once per game: a refused claim warns once and is not retried on the next board update', async () => {
    patch.mockRejectedValue(new Error('PERMISSION_DENIED'));
    await service.claimIfInvited('game02', invited);
    await service.claimIfInvited('game02', invited);
    expect(patch).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(addJoinedGame).not.toHaveBeenCalled();
  });

  it('keeps the role when the dashboard entry fails', async () => {
    addJoinedGame.mockRejectedValueOnce(new Error('offline'));
    await expect(service.claimIfInvited('game02', invited)).resolves.toBeUndefined();
    expect(warning).not.toHaveBeenCalled();
  });
});
