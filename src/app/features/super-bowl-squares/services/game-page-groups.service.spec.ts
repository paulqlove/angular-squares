import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GameGroupsService } from '../../../core/services/game-groups.service';
import { GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { GamePageGroupsService } from './game-page-groups.service';
import { GameStateService } from './game-state.service';

const CHURCH = 'ChurchGroupKey000001';
const NONE = 'NoGroupKey0000000001';

describe('GamePageGroupsService', () => {
  let service: GamePageGroupsService;
  let state: { ownerId: ReturnType<typeof signal<string>>; isGameOwner: ReturnType<typeof signal<boolean>>; isManager: ReturnType<typeof signal<boolean>>; gameId: string; gameOwnerId: string; openListId?: string; showInOpenBoards: boolean; boardSize: number; isLocked: boolean; squaresPicked: () => number };
  let api: { getGroups: ReturnType<typeof vi.fn>; saveChoice: ReturnType<typeof vi.fn> };
  let setShowInOpenBoards: ReturnType<typeof vi.fn>;
  let warning: ReturnType<typeof vi.fn>;
  const features = signal({ gameGroups: true });

  function setup(owner: boolean): void {
    state = {
      ownerId: signal('o'), isGameOwner: signal(owner), isManager: signal(!owner),
      gameId: 'a', gameOwnerId: 'o', openListId: NONE, showInOpenBoards: false, boardSize: 100, isLocked: false, squaresPicked: () => 10
    };
    api = {
      getGroups: vi.fn().mockResolvedValue([{ id: CHURCH, name: 'Church', createdAt: 1 }]),
      saveChoice: vi.fn().mockResolvedValue({ listId: CHURCH })
    };
    setShowInOpenBoards = vi.fn().mockResolvedValue(NONE);
    warning = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        GamePageGroupsService,
        { provide: GameStateService, useValue: state },
        { provide: GameGroupsService, useValue: api },
        { provide: GameService, useValue: { setShowInOpenBoards } },
        { provide: PlanService, useValue: { features } },
        { provide: ToastService, useValue: { warning, error: vi.fn() } }
      ]
    });
    service = TestBed.inject(GamePageGroupsService);
    TestBed.tick();
  }

  beforeEach(() => features.set({ gameGroups: true }));

  it('loads the owner\'s groups and starts the picker on the board\'s group', async () => {
    setup(true);
    await vi.waitFor(() => expect(service.groups()).toHaveLength(1));
    expect(api.getGroups).toHaveBeenCalledWith('o');
    expect(service.choice()).toEqual({ groupId: null });
    expect(service.canNewGroup()).toBe(true);
  });

  it('gives a co-host the picker, but no New group, once the owner has a group', async () => {
    setup(false);
    expect(service.canPick()).toBe(false);
    await vi.waitFor(() => expect(service.canPick()).toBe(true));
    expect(service.canNewGroup()).toBe(false);
  });

  it('hides the picker from an owner without a Season Pass (groups frozen)', async () => {
    features.set({ gameGroups: false });
    setup(true);
    await vi.waitFor(() => expect(service.groups()).toHaveLength(1));
    expect(service.choice()).toBeUndefined();
  });

  it('files the board only when the choice moves it', async () => {
    setup(true);
    await vi.waitFor(() => expect(service.groups()).toHaveLength(1));
    expect(await service.saveChoice({ groupId: null })).toBe(true);
    expect(api.saveChoice).not.toHaveBeenCalled();
    expect(await service.saveChoice({ groupId: CHURCH })).toBe(true);
    expect(state.openListId).toBe(CHURCH);
  });

  it('warns and keeps the board where it was when filing fails', async () => {
    setup(true);
    api.saveChoice.mockRejectedValueOnce(new Error('permission_denied'));
    await vi.waitFor(() => expect(service.groups()).toHaveLength(1));
    expect(await service.saveChoice({ groupId: CHURCH })).toBe(false);
    expect(state.openListId).toBe(NONE);
    expect(warning).toHaveBeenCalled();
  });

  it('saves a co-host\'s switch, then the group, and closes', async () => {
    setup(false);
    await vi.waitFor(() => expect(service.groups()).toHaveLength(1));
    service.coHostEditOpen.set(true);
    await service.saveCoHostEdit(true, { groupId: CHURCH });
    expect(setShowInOpenBoards).toHaveBeenCalledWith({ id: 'a', ownerId: 'o', openListId: NONE }, true);
    expect(api.saveChoice).toHaveBeenCalledWith({ id: 'a', ownerId: 'o', openListId: NONE, showInOpenBoards: true }, { groupId: CHURCH });
    expect(service.coHostEditOpen()).toBe(false);
  });
});
