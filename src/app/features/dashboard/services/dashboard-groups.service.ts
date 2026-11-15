import { Injectable, computed, inject, signal } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { GameGroupsService } from '../../../core/services/game-groups.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameGroup, GroupedBoard, cleanGroupName, deleteGroupMessage, groupCounts, groupOf } from '../../../core/utils/game-groups';

/** A group with how many of the owner's games are filed in it, for the Groups row and sheet. */
export interface GroupRow extends GameGroup {
  count: number;
}

/**
 * The owner's game groups on the dashboard: the list, the Groups sheet, and making, renaming and deleting a group.
 * Season Pass owners can change groups; without the pass they stay as filed (frozen) and only show.
 * Provided on the dashboard. It never reads the board list itself: callers pass the owner's boards in.
 */
@Injectable()
export class DashboardGroupsService {
  /** True when this owner may make, rename or delete groups. */
  public readonly canEdit = computed<boolean>(() => this.planService.features().gameGroups);
  /** In the Groups sheet: 'new' while naming a new group, a group id while renaming it, else null. */
  public readonly editing = signal<string | null>(null);
  public readonly groups = signal<GameGroup[]>([]);
  public readonly saving = signal<boolean>(false);
  public readonly sheetOpen = signal<boolean>(false);

  /** Loads the owner's groups. A failed read leaves the list empty; More keeps working either way. */
  public async load(ownerId: string): Promise<void> {
    this.groups.set(await this.gameGroups.getGroups(ownerId));
  }

  /** The group name shown on a hosted game's card, or undefined for No group. */
  public nameOf(board: GroupedBoard): string | undefined {
    return groupOf(this.groups(), board)?.name;
  }

  public rows(boards: GroupedBoard[]): GroupRow[] {
    const counts = groupCounts(boards);
    return this.groups().map(group => ({ ...group, count: counts.get(group.id) ?? 0 }));
  }

  /** Saves the name being edited: a new group, or a rename. Returns false when the name is empty or the save failed. */
  public async saveName(ownerId: string, typed: string): Promise<boolean> {
    const name = cleanGroupName(typed);
    const editing = this.editing();
    if (!name || !editing || this.saving()) return false;
    this.saving.set(true);
    try {
      if (editing === 'new') {
        const group = await this.gameGroups.createGroup(ownerId, name);
        this.groups.update(groups => [...groups, group]);
      } else {
        await this.gameGroups.renameGroup(ownerId, editing, name);
        this.groups.update(groups => groups.map(g => g.id === editing ? { ...g, name } : g));
      }
      this.editing.set(null);
      return true;
    } catch {
      this.toastService.error(editing === 'new' ? 'Could not make the group. Try again.' : 'Could not rename the group. Try again.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Asks, then deletes a group and moves its games to No group. Returns the No group key the games moved to,
   * so the caller can update its list, or null when the owner said no or the delete failed.
   */
  public async remove(ownerId: string, group: GameGroup, boards: GroupedBoard[]): Promise<string | null> {
    const count = groupCounts(boards).get(group.id) ?? 0;
    const ok = await this.confirmService.ask({ title: `Delete ${group.name}?`, message: deleteGroupMessage(count), confirmLabel: 'Delete group' });
    if (!ok) return null;
    try {
      const ungrouped = await this.gameGroups.deleteGroup(ownerId, group.id, boards);
      this.groups.update(groups => groups.filter(g => g.id !== group.id));
      return ungrouped;
    } catch {
      this.toastService.error('Could not delete the group. Try again.');
      return null;
    }
  }

  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly gameGroups: GameGroupsService = inject(GameGroupsService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly toastService: ToastService = inject(ToastService);
}
