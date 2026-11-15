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

  beforeEach(() => {
    preview = false;
    TestBed.configureTestingModule({
      providers: [
        { provide: GameDatabaseService, useValue: { isBrowser: true } },
        { provide: AuthService, useValue: { blockPreviewWrite: () => preview } },
        { provide: BoardSettingsService, useValue: { ungroupedKey: vi.fn().mockResolvedValue(NONE) } }
      ]
    });
    service = TestBed.inject(GameGroupsService);
    db = service as unknown as Db;
    db.read = vi.fn();
    db.save = vi.fn().mockResolvedValue(undefined);
    db.patch = vi.fn().mockResolvedValue(undefined);
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

  it('writes nothing while the admin previews another role', async () => {
    preview = true;
    await expect(service.createGroup('o', 'Work')).rejects.toThrow('Preview only');
    expect(db.save).not.toHaveBeenCalled();
  });
});
