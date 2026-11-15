import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConfirmService } from '../../../core/services/confirm.service';
import { GameGroupsService } from '../../../core/services/game-groups.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardGroupsService } from './dashboard-groups.service';

const CHURCH = 'ChurchGroupKey000001';
const WORK = 'WorkGroupKey00000001';
const NONE = 'NoGroupKey0000000001';

describe('DashboardGroupsService', () => {
  let service: DashboardGroupsService;
  let api: { getGroups: ReturnType<typeof vi.fn>; createGroup: ReturnType<typeof vi.fn>; renameGroup: ReturnType<typeof vi.fn>; deleteGroup: ReturnType<typeof vi.fn>; saveChoice: ReturnType<typeof vi.fn> };
  let ask: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;
  let toastWarning: ReturnType<typeof vi.fn>;
  const features = signal({ gameGroups: true });
  const boards = [
    { id: 'a', ownerId: 'o', openListId: CHURCH },
    { id: 'b', ownerId: 'o', openListId: CHURCH },
    { id: 'c', ownerId: 'o', openListId: NONE }
  ];

  beforeEach(async () => {
    api = {
      getGroups: vi.fn().mockResolvedValue([{ id: CHURCH, name: 'Church', createdAt: 1 }, { id: WORK, name: 'Work', createdAt: 2 }]),
      createGroup: vi.fn().mockResolvedValue({ id: 'NewGroupKey000000001', name: 'Gym', createdAt: 3 }),
      renameGroup: vi.fn().mockResolvedValue(undefined),
      deleteGroup: vi.fn().mockResolvedValue(NONE),
      saveChoice: vi.fn().mockResolvedValue({ listId: CHURCH })
    };
    ask = vi.fn().mockResolvedValue(true);
    toastError = vi.fn();
    toastWarning = vi.fn();
    features.set({ gameGroups: true });
    TestBed.configureTestingModule({
      providers: [
        DashboardGroupsService,
        { provide: GameGroupsService, useValue: api },
        { provide: ConfirmService, useValue: { ask } },
        { provide: PlanService, useValue: { features } },
        { provide: ToastService, useValue: { error: toastError, warning: toastWarning } }
      ]
    });
    service = TestBed.inject(DashboardGroupsService);
    await service.load('o');
  });

  it('counts games per group and names each hosted game\'s group', () => {
    expect(service.rows(boards).map(r => [r.name, r.count])).toEqual([['Church', 2], ['Work', 0]]);
    expect(service.nameOf(boards[0])).toBe('Church');
    expect(service.nameOf(boards[2])).toBeUndefined();
  });

  it('only a Season Pass owner can change groups', () => {
    expect(service.canEdit()).toBe(true);
    features.set({ gameGroups: false });
    expect(service.canEdit()).toBe(false);
  });

  it('makes a new group with the trimmed name, and refuses an empty one', async () => {
    service.editing.set('new');
    expect(await service.saveName('o', '   ')).toBe(false);
    expect(api.createGroup).not.toHaveBeenCalled();
    expect(await service.saveName('o', '  Gym ')).toBe(true);
    expect(api.createGroup).toHaveBeenCalledWith('o', 'Gym');
    expect(service.groups().map(g => g.name)).toEqual(['Church', 'Work', 'Gym']);
    expect(service.editing()).toBeNull();
  });

  it('renames in place', async () => {
    service.editing.set(WORK);
    await service.saveName('o', 'Office');
    expect(api.renameGroup).toHaveBeenCalledWith('o', WORK, 'Office');
    expect(service.nameOf({ id: 'x', ownerId: 'o', openListId: WORK })).toBe('Office');
  });

  it('asks with the game count before deleting, then moves its games to No group', async () => {
    expect(await service.remove('o', service.groups()[0], boards)).toBe(NONE);
    expect(ask.mock.calls[0][0].message).toBe('2 games will show alongside your other ungrouped games.');
    expect(api.deleteGroup).toHaveBeenCalledWith('o', CHURCH, boards);
    expect(service.groups().map(g => g.name)).toEqual(['Work']);
  });

  it('keeps the group when the owner says no or the delete fails', async () => {
    ask.mockResolvedValueOnce(false);
    expect(await service.remove('o', service.groups()[0], boards)).toBeNull();
    api.deleteGroup.mockRejectedValueOnce(new Error('permission_denied'));
    expect(await service.remove('o', service.groups()[0], boards)).toBeNull();
    expect(toastError).toHaveBeenCalledWith('Could not delete the group. Try again.');
    expect(service.groups()).toHaveLength(2);
  });

  describe('filing a board Create game just made', () => {
    const made = { id: 'new', ownerId: 'o', openListId: NONE, showInOpenBoards: true };

    it('files it into the picked group, and adds a group named in the picker', async () => {
      expect(await service.fileNewBoard(made, { groupId: CHURCH })).toBe(true);
      expect(api.saveChoice).toHaveBeenCalledWith(made, { groupId: CHURCH });
      api.saveChoice.mockResolvedValueOnce({ listId: 'NewGroupKey000000001', created: { id: 'NewGroupKey000000001', name: 'Gym', createdAt: 3 } });
      await service.fileNewBoard(made, { groupId: null, newName: 'Gym' });
      expect(service.groups().map(g => g.name)).toEqual(['Church', 'Work', 'Gym']);
    });

    it('writes nothing for No group, a blank new name, no picker or no Season Pass', async () => {
      await service.fileNewBoard(made, { groupId: null });
      await service.fileNewBoard(made, { groupId: null, newName: '  ' });
      await service.fileNewBoard(made, undefined);
      features.set({ gameGroups: false });
      await service.fileNewBoard(made, { groupId: CHURCH });
      expect(api.saveChoice).not.toHaveBeenCalled();
    });

    it('warns and keeps going when the group could not be set', async () => {
      api.saveChoice.mockRejectedValueOnce(new Error('permission_denied'));
      expect(await service.fileNewBoard(made, { groupId: WORK })).toBe(false);
      expect(toastWarning).toHaveBeenCalledWith('Board created, but its group could not be set. Try again in Edit.');
    });
  });
});
