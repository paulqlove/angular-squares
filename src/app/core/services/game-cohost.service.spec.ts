import { TestBed } from '@angular/core/testing';

import { GameCoHostService } from './game-cohost.service';
import { GameDatabaseService } from './game-database.service';
import { GameGroupsService } from './game-groups.service';
import { GameService } from './game.service';
import { ToastService } from './toast.service';

describe('GameCoHostService', () => {
  const game = { id: 'G1', ownerId: 'host-1', managerId: 'p-2' };
  let service: GameCoHostService;
  let updateGameManager: ReturnType<typeof vi.fn>;
  let setCoHost: ReturnType<typeof vi.fn>;
  let toast: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    updateGameManager = vi.fn().mockResolvedValue(undefined);
    setCoHost = vi.fn().mockResolvedValue(undefined);
    toast = { error: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: GameDatabaseService, useValue: { isBrowser: false } },
        { provide: GameGroupsService, useValue: { setCoHost } },
        { provide: GameService, useValue: { updateGameManager } },
        { provide: ToastService, useValue: toast }
      ]
    });
    service = TestBed.inject(GameCoHostService);
  });

  it('assigns a player and marks them so they can read group names', async () => {
    expect(await service.assignPlayer(game, { name: 'Sam', uid: 'p-3' })).toBe(true);
    expect(updateGameManager).toHaveBeenCalledWith('G1', 'host-1', { managerId: 'p-3', managerName: 'Sam' });
    expect(setCoHost).toHaveBeenCalledWith('host-1', 'p-3', true);
  });

  it('says so and returns false when assigning fails', async () => {
    updateGameManager.mockRejectedValue(new Error('denied'));
    expect(await service.assignPlayer(game, { name: 'Sam', uid: 'p-3' })).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Could not assign the co-host. Try again.');
    expect(setCoHost).not.toHaveBeenCalled();
  });

  it('removes the co-host and unmarks them when they co-host nothing else', async () => {
    expect(await service.replace(game, null, 'failed', () => false)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(updateGameManager).toHaveBeenCalledWith('G1', 'host-1', { managerEmail: null });
    expect(setCoHost).toHaveBeenCalledWith('host-1', 'p-2', false);
  });

  it('keeps the mark while they co-host another game, and shows the failure message when the save fails', async () => {
    await service.replace(game, 'sam@example.com', 'failed', () => true);
    await Promise.resolve();
    expect(setCoHost).not.toHaveBeenCalled();
    updateGameManager.mockRejectedValue(new Error('denied'));
    expect(await service.replace(game, null, 'Could not remove the co-host. Try again.', () => false)).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Could not remove the co-host. Try again.');
  });

  it('adds the group co-host by email, warning when it fails', async () => {
    expect(await service.addGroupCoHost(game, 'sam@example.com')).toBe(true);
    expect(updateGameManager).toHaveBeenCalledWith('G1', 'host-1', { managerEmail: 'sam@example.com' });
    updateGameManager.mockRejectedValue(new Error('denied'));
    expect(await service.addGroupCoHost(game, 'sam@example.com')).toBe(false);
    expect(toast.warning).toHaveBeenCalled();
  });

  it('lists the players other than the signed-in host', () => {
    expect(service.players({ Paul: 'host-1', Sam: 'p-2' }, 'host-1')).toEqual([{ name: 'Sam', uid: 'p-2' }]);
    expect(service.players(undefined, 'host-1')).toEqual([]);
  });
});
