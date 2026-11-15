import { Injectable, computed, inject, signal } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { GameGroupsService } from '../../../core/services/game-groups.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameGroup, GroupChoice, GroupedBoard, cleanGroupName, deleteGroupMessage, groupChanged, groupCounts, groupOf } from '../../../core/utils/game-groups';

/** A group with how many of the owner's games are filed in it, for the group pickers and the Groups sheet. */
export interface GroupRow extends GameGroup {
  count: number;
}

/**
 * The owner's game groups on the dashboard: the list, which group Hosting is narrowed to, the Groups sheets, and making,
 * renaming and deleting a group.
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
  /** The group Hosting is narrowed to, or undefined for All groups. A group deleted while picked falls back to All groups. */
  public readonly picked = computed<GameGroup | undefined>(() => this.groups().find(g => g.id === this.pickedId()));
  /** The id picked in the group picker, or null for All groups. */
  public readonly pickedId = signal<string | null>(null);
  /** What the pickers say: the picked group's name, or All groups. */
  public readonly pickedName = computed<string>(() => this.picked()?.name ?? 'All groups');
  /** The phone's short Groups sheet, for picking a group. */
  public readonly pickSheetOpen = signal<boolean>(false);
  public readonly saving = signal<boolean>(false);
  /** The Groups sheet, for making, renaming and deleting groups. */
  public readonly sheetOpen = signal<boolean>(false);

  /** Loads the owner's groups. A failed read leaves the list empty; More keeps working either way. */
  public async load(ownerId: string): Promise<void> {
    this.groups.set(await this.gameGroups.getGroups(ownerId));
  }

  /**
   * Files a board Create game just made where its Group picker was left. No group needs no write.
   * Returns false, after a warning, when it could not be filed; the board itself is already made.
   */
  public async fileNewBoard(board: GroupedBoard, choice: GroupChoice | undefined): Promise<boolean> {
    if (!choice || !this.canEdit() || !groupChanged(this.groups(), undefined, choice)) return true;
    try {
      const { created } = await this.gameGroups.saveChoice(board, choice);
      if (created) this.groups.update(groups => [...groups, created]);
      return true;
    } catch {
      this.toastService.warning('Board created, but its group could not be set. Try again in Edit.');
      return false;
    }
  }

  /** Manage groups, from the picker: the phone's pick sheet makes way for the Groups sheet. */
  public openManage(): void {
    this.pickSheetOpen.set(false);
    this.sheetOpen.set(true);
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
