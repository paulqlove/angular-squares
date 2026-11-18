import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BoardSettingsService } from './board-settings.service';
import { GameDatabaseService } from './game-database.service';
import { GameGroupsService } from './game-groups.service';

const CHURCH = 'ChurchGroupKey000001';
const NONE = 'NoGroupKey0000000001';

/** The service with its three database calls stood in for. */
interface Db {
  read: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

describe('GameGroupsService', () => {
  let service: GameGroupsService;
  let db: Db;
  let preview: boolean;
  let me: string;

  beforeEach(() => {
    preview = false;
    me = 'o';
    TestBed.configureTestingModule({
      providers: [
        { provide: GameDatabaseService, useValue: { isBrowser: true } },
        { provide: AuthService, useValue: { blockPreviewWrite: () => preview, currentUser: () => ({ uid: me }) } },
        { provide: BoardSettingsService, useValue: { ungroupedKey: vi.fn().mockResolvedValue(NONE) } }
      ]
    });
    service = TestBed.inject(GameGroupsService);
    db = service as unknown as Db;
    db.read = vi.fn().mockResolvedValue(undefined);
    db.save = vi.fn().mockResolvedValue(undefined);
    db.patch = vi.fn().mockResolvedValue(undefined);
  });

  it('reads each group\'s co-host only for the owner; a co-host gets the groups without them', async () => {
    const groups = { [CHURCH]: { name: 'Church', createdAt: 1 } };
    db.read.mockImplementation(async (path: string) => path === 'groupLists/o/groups' ? groups : { [CHURCH]: { email: 'dana@email.com' } });
    expect(await service.getGroups('o')).toEqual([{ id: CHURCH, name: 'Church', createdAt: 1, coHost: { email: 'dana@email.com' } }]);
    me = 'cohost';
    db.read.mockClear();
    expect(await service.getGroups('o')).toEqual([{ id: CHURCH, name: 'Church', createdAt: 1 }]);
    expect(db.read.mock.calls).toEqual([['groupLists/o/groups']]);
  });

  it('still reads the groups when the owner\'s co-host read fails', async () => {
    db.read.mockImplementation(async (path: string) => {
      if (path === 'groupLists/o/groups') return { [CHURCH]: { name: 'Church', createdAt: 1 } };
      throw new Error('permission_denied');
    });
    expect(await service.getGroups('o')).toEqual([{ id: CHURCH, name: 'Church', createdAt: 1 }]);
  });

  it('reads the owner\'s groups, and none when the read is turned away', async () => {
    db.read.mockResolvedValueOnce({ [CHURCH]: { name: 'Church', createdAt: 1 } });
    expect(await service.getGroups('o')).toEqual([{ id: CHURCH, name: 'Church', createdAt: 1 }]);
    expect(db.read).toHaveBeenCalledWith('groupLists/o/groups');
    db.read.mockRejectedValueOnce(new Error('permission_denied'));
    expect(await service.getGroups('o')).toEqual([]);
  });

  it('creates a group under the owner with a random list key', async () => {
    const group = await service.createGroup('o', 'Work');
    expect(group.id).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(db.save).toHaveBeenCalledWith(`groupLists/o/groups/${group.id}`, { name: 'Work', createdAt: group.createdAt });
  });

  it('renames only the name', async () => {
    await service.renameGroup('o', CHURCH, 'Sunday');
    expect(db.save).toHaveBeenCalledWith(`groupLists/o/groups/${CHURCH}/name`, 'Sunday');
  });

  it('deletes a group and moves its games to No group in one write', async () => {
    expect(await service.deleteGroup('o', CHURCH, [{ id: 'a', ownerId: 'o', openListId: CHURCH, showInOpenBoards: true }])).toBe(NONE);
    expect(db.patch).toHaveBeenCalledTimes(1);
    const updates = db.patch.mock.calls[0][0] as Record<string, unknown>;
    expect(updates[`groupLists/o/groups/${CHURCH}`]).toBeNull();
    expect(updates['games/a/openListId']).toBe(NONE);
    expect(updates[`openLists/${NONE}/a`]).toBe('o');
  });

  it('files a board into No group when no group is picked', async () => {
    expect(await service.fileBoard({ id: 'a', ownerId: 'o', openListId: CHURCH }, null)).toBe(NONE);
    expect(await service.fileBoard({ id: 'a', ownerId: 'o', openListId: NONE }, CHURCH)).toBe(CHURCH);
    expect(db.patch).toHaveBeenCalledTimes(2);
  });

  it('always shows a board filed into a group, and keeps the switch for No group', async () => {
    await service.fileBoard({ id: 'a', ownerId: 'o', openListId: NONE }, CHURCH);
    await service.fileBoard({ id: 'b', ownerId: 'o', openListId: CHURCH }, null);
    const [grouped, ungrouped] = db.patch.mock.calls.map(call => call[0] as Record<string, unknown>);
    expect(grouped['games/a/showInOpenBoards']).toBe(true);
    expect(grouped[`openLists/${CHURCH}/a`]).toBe('o');
    expect(ungrouped['games/b/showInOpenBoards']).toBeNull();
    expect(ungrouped[`openLists/${NONE}/b`]).toBeNull();
  });

  it('makes a named new group before filing the board into it', async () => {
    const result = await service.saveChoice({ id: 'a', ownerId: 'o', openListId: NONE, showInOpenBoards: true }, { groupId: null, newName: ' Gym ' });
    expect(result.created?.name).toBe('Gym');
    expect(result.listId).toBe(result.created?.id);
    const updates = db.patch.mock.calls[0][0] as Record<string, unknown>;
    expect(updates[`openLists/${result.listId}/a`]).toBe('o');
    expect(updates[`openLists/${NONE}/a`]).toBeNull();
  });

  it('marks and unmarks a co-host under the owner', async () => {
    await service.setCoHost('o', 'c', true);
    await service.setCoHost('o', 'c', false);
    expect(db.save.mock.calls).toEqual([['coHosts/o/c', true], ['coHosts/o/c', null]]);
  });

  it('writes nothing while the admin previews another role', async () => {
    preview = true;
    await expect(service.createGroup('o', 'Work')).rejects.toThrow('Preview only');
    expect(db.save).not.toHaveBeenCalled();
  });

  it('sets a group\'s co-host and its games in one write', async () => {
    await service.setGroupCoHost('o', CHURCH, { email: 'dana@email.com' }, { addTo: ['a'], clearFrom: [] });
    expect(db.patch).toHaveBeenCalledWith({
      [`groupCoHosts/o/${CHURCH}`]: { email: 'dana@email.com' },
      'games/a/managerId': '', 'games/a/managerName': '', 'games/a/managerEmail': null, 'gameCoHosts/o/a': 'dana@email.com'
    });
    preview = true;
    await expect(service.setGroupCoHost('o', CHURCH, null, { addTo: [], clearFrom: [] })).rejects.toThrow('Preview only');
  });

  it('a new group from Create game can carry its co-host; a bad email is left off', async () => {
    const result = await service.saveChoice({ id: 'a', ownerId: 'o', openListId: NONE }, { groupId: null, newName: 'Gym', newCoHost: ' lee@email.com ' });
    expect(result.created?.coHost).toEqual({ email: 'lee@email.com' });
    const id = result.created?.id;
    expect(db.patch).toHaveBeenCalledWith({
      [`groupLists/o/groups/${id}`]: { name: 'Gym', createdAt: result.created?.createdAt },
      [`groupCoHosts/o/${id}`]: { email: 'lee@email.com' }
    });
    const plain = await service.saveChoice({ id: 'b', ownerId: 'o', openListId: NONE }, { groupId: null, newName: 'Run', newCoHost: 'lee' });
    expect(plain.created?.coHost).toBeUndefined();
    expect(db.save).toHaveBeenCalledWith(`groupLists/o/groups/${plain.created?.id}`, { name: 'Run', createdAt: plain.created?.createdAt });
  });

  it('reads each board\'s list id together, leaving out boards with none, a bad value or a failed read', async () => {
    db.read = vi.fn((path: string) => {
      if (path === 'games/a/openListId') return Promise.resolve(CHURCH);
      if (path === 'games/b/openListId') return Promise.resolve(null);
      if (path === 'games/c/openListId') return Promise.resolve('not a key!');
      return Promise.reject(new Error('denied'));
    });
    const ids = await service.listIdsOf(['a', 'b', 'c', 'd']);
    expect([...ids]).toEqual([['a', CHURCH]]);
    expect(db.read).toHaveBeenCalledTimes(4);
  });
});
