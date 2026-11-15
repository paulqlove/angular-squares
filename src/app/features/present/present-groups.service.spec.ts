import { TestBed } from '@angular/core/testing';

import { GameGroupsService } from '../../core/services/game-groups.service';
import { LastGroupService } from '../../core/services/last-group.service';
import { PresentGroupsService } from './present-groups.service';

const WORK = 'WorkGroupKey00000001';
const HOME = 'HomeGroupKey00000001';
const EMPTY = 'EmptyGroupKey0000001';

describe('PresentGroupsService', () => {
  let service: PresentGroupsService;
  let api: { getGroups: ReturnType<typeof vi.fn>; listIdsOf: ReturnType<typeof vi.fn> };
  let last: LastGroupService;

  beforeEach(() => {
    api = {
      getGroups: vi.fn().mockResolvedValue([
        { id: WORK, name: 'Work', createdAt: 1 },
        { id: HOME, name: 'Home', createdAt: 2 },
        { id: EMPTY, name: 'Empty', createdAt: 3 }
      ]),
      listIdsOf: vi.fn().mockResolvedValue(new Map([['a', WORK], ['b', HOME], ['c', WORK]]))
    };
    TestBed.configureTestingModule({ providers: [PresentGroupsService, { provide: GameGroupsService, useValue: api }] });
    service = TestBed.inject(PresentGroupsService);
    last = TestBed.inject(LastGroupService);
  });

  it('lists the groups with counts and gives all boards, in order, under All groups', async () => {
    await service.load('o', ['a', 'b', 'c', 'd']);
    expect(service.rows().map(r => [r.name, r.count])).toEqual([['Work', 2], ['Home', 1], ['Empty', 0]]);
    expect(service.pickedId()).toBeNull();
    expect(service.pickedName()).toBeNull();
    expect(service.boardIds()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('gives only the picked group\'s boards', async () => {
    await service.load('o', ['a', 'b', 'c', 'd']);
    service.pickedId.set(WORK);
    expect(service.pickedName()).toBe('Work');
    expect(service.boardIds()).toEqual(['a', 'c']);
  });

  it('starts on the group the dashboard last showed', async () => {
    last.id.set(HOME);
    await service.load('o', ['a', 'b', 'c']);
    expect(service.pickedId()).toBe(HOME);
    expect(service.boardIds()).toEqual(['b']);
  });

  it('starts on All groups when that group is empty, gone, or leaves out the board opened by link', async () => {
    last.id.set(EMPTY);
    await service.load('o', ['a', 'b', 'c']);
    expect(service.pickedId()).toBeNull();
    last.id.set('GoneGroupKey00000001');
    await service.load('o', ['a', 'b', 'c']);
    expect(service.pickedId()).toBeNull();
    last.id.set(WORK);
    await service.load('o', ['a', 'b', 'c'], 'b');
    expect(service.pickedId()).toBeNull();
    await service.load('o', ['a', 'b', 'c'], 'c');
    expect(service.pickedId()).toBe(WORK);
  });

  it('reads no board lists for a host with no groups, and still gives all boards', async () => {
    api.getGroups.mockResolvedValue([]);
    await service.load('o', ['a', 'b']);
    expect(api.listIdsOf).not.toHaveBeenCalled();
    expect(service.rows()).toEqual([]);
    expect(service.boardIds()).toEqual(['a', 'b']);
  });
});
