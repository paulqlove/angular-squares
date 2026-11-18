import { Injectable, computed, inject, signal } from '@angular/core';

import { GameGroupsService } from '../../core/services/game-groups.service';
import { LastGroupService } from '../../core/services/last-group.service';
import { GameGroup, GroupRow, gamesInGroup, groupRows } from '../../core/utils/game-groups';
import { OpenListTarget } from '../../core/utils/open-lists';

/**
 * TV mode's group filter (Creative's tv-group, Nov 15): the host's groups with their board counts, which one is
 * picked, and the boards to show for it. Provided on the Present page.
 */
@Injectable()
export class PresentGroupsService {
  /** The picked group's id, or null for All groups. */
  public readonly pickedId = signal<string | null>(null);
  /** The picked group's id and name, or null for All groups. */
  public readonly picked = computed<{ id: string; name: string } | null>(() => {
    const row = this.rows().find(group => group.id === this.pickedId());
    return row ? { id: row.id, name: row.name } : null;
  });
  /** Each of the host's groups with how many of their boards are in it. Empty when the host has no groups. */
  public readonly rows = computed<GroupRow[]>(() => groupRows(this.groups(), this.boards()));

  /** The picked group's board ids, in the order the boards were loaded, or every board under All groups. */
  public boardIds(): string[] {
    return gamesInGroup(this.boards(), this.pickedId()).map(board => board.id);
  }

  /**
   * Loads the host's groups (while the board ids load) and, only when there is at least one, which group each board is in. Starts on the group
   * the dashboard last showed when it has boards here, unless `mustShow` (the board opened by link) is not in it.
   */
  public async load(ownerId: string, boardIdsLoading: Promise<string[]>, mustShow?: string): Promise<void> {
    const [boardIds, groups] = await Promise.all([boardIdsLoading, this.gameGroups.getGroups(ownerId)]);
    this.boards.set(boardIds.map(id => ({ id, ownerId })));
    if (!groups.length) return;
    const listIds = await this.gameGroups.listIdsOf(boardIds);
    this.boards.set(boardIds.map(id => ({ id, ownerId, openListId: listIds.get(id) })));
    this.groups.set(groups);
    const last = this.rows().find(row => row.id === this.lastGroup.id() && row.count > 0);
    this.pickedId.set(last && (!mustShow || listIds.get(mustShow) === last.id) ? last.id : null);
  }

  private readonly boards = signal<OpenListTarget[]>([]);
  private readonly gameGroups: GameGroupsService = inject(GameGroupsService);
  private readonly groups = signal<GameGroup[]>([]);
  private readonly lastGroup: LastGroupService = inject(LastGroupService);
}
