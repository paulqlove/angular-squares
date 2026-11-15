import { Injectable, computed, inject, signal } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { GameGroupsService } from '../../../core/services/game-groups.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameGroup, GroupChoice, GroupedBoard, cleanGroupName, deleteGroupMessage, groupChanged, groupCounts, groupOf } from '../../../core/utils/game-groups';
import { CoHostedBoard, cleanCoHostEmail, coHostPlan, gamesWithCoHost, removeCoHostQuestion } from '../../../core/utils/group-cohost';

/** What saving a group's co-host did to the owner's games, so the caller can update its list. */
export interface CoHostSaved {
  email: string;
  addTo: string[];
  clearFrom: string[];
}

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
  /** In the Groups sheet: the group whose co-host field is open, else null. */
  public readonly editingCoHost = signal<string | null>(null);
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
   * Saves a group's co-host from the Groups sheet (K2). An email gives it to the group's games with no co-host.
   * An empty field removes it, and asks whether to clear it from the games that have it. Never replaces a game's own co-host.
   * Returns what changed, or null when nothing was saved.
   */
  public async saveCoHost(ownerId: string, group: GameGroup, typed: string, boards: CoHostedBoard[]): Promise<CoHostSaved | null> {
    const email = cleanCoHostEmail(typed);
    if (this.saving() || (!email && !group.coHost)) {
      this.editingCoHost.set(null);
      return null;
    }
    const games = email ? { addTo: coHostPlan(boards, group.id, email).adds.map(b => b.id), clearFrom: [] } : await this.removeFrom(group, boards);
    this.saving.set(true);
    try {
      await this.gameGroups.setGroupCoHost(ownerId, group.id, email ? { email } : null, games);
      this.groups.update(groups => groups.map(g => g.id === group.id ? { ...g, coHost: email ? { email } : undefined } : g));
      this.editingCoHost.set(null);
      return { email, ...games };
    } catch {
      this.toastService.error('Could not save the co-host. Try again.');
      return null;
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

  /** Removing the group's co-host: asks whether to clear it from the games that have it too. No asks clears none. */
  private async removeFrom(group: GameGroup, boards: CoHostedBoard[]): Promise<{ addTo: string[]; clearFrom: string[] }> {
    const email = group.coHost?.email ?? '';
    const having = gamesWithCoHost(boards, group.id, email);
    if (!having.length) return { addTo: [], clearFrom: [] };
    const yes = await this.confirmService.ask({ ...removeCoHostQuestion(email, group.name, having.length), tone: 'primary' });
    return { addTo: [], clearFrom: yes ? having.map(b => b.id) : [] };
  }

  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly gameGroups: GameGroupsService = inject(GameGroupsService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly toastService: ToastService = inject(ToastService);
}
