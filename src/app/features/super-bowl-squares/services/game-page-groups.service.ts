import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { GameGroupsService } from '../../../core/services/game-groups.service';
import { GameService, getBoardDimensions } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameGroup, GroupChoice, groupChanged, pickerValue } from '../../../core/utils/game-groups';
import { GameStateService } from './game-state.service';

/**
 * Game groups on the game page, for the owner and a co-host: the owner's groups for Edit game's Group picker,
 * and the co-host's small Edit game (Show in my open boards and Group only). Players never load them.
 */
@Injectable()
export class GamePageGroupsService {
  constructor() {
    // The owner's groups load once per board for its owner or co-host (the rules let only them read)
    effect(() => {
      const ownerId = this.state.ownerId();
      if (!ownerId || !(this.state.isGameOwner() || this.state.isManager())) return;
      untracked(() => void this.gameGroups.getGroups(ownerId).then(groups => this.groups.set(groups)));
    });
  }

  /** The owner with a Season Pass can make a group from the picker. */
  public readonly canNewGroup = computed<boolean>(() => this.state.isGameOwner() && this.planService.features().gameGroups);
  /** The picker shows for the owner with a Season Pass, and for a co-host once the owner has a group. */
  public readonly canPick = computed<boolean>(() => this.canNewGroup() || (this.state.isManager() && this.groups().length > 0));
  /** The co-host's own Edit game dialog is open. */
  public readonly coHostEditOpen = signal<boolean>(false);
  public readonly groups = signal<GameGroup[]>([]);
  public readonly saving = signal<boolean>(false);

  /** A co-host may show this board in More while it is open, or hide it once shown. */
  public coHostCanShow(): boolean {
    const { rows, cols } = getBoardDimensions(this.state.boardSize);
    return this.state.showInOpenBoards || (!this.state.isLocked && this.state.squaresPicked() < rows * cols);
  }

  /** The picker's starting choice for Edit game, or undefined when it doesn't show. */
  public choice(): GroupChoice | undefined {
    return this.canPick() ? { groupId: pickerValue(this.groups(), this.state.openListId) } : undefined;
  }

  /** Files the board where the picker was left. False (after a warning) when it could not be saved. */
  public async saveChoice(choice: GroupChoice | undefined): Promise<boolean> {
    const state = this.state;
    if (!choice || !groupChanged(this.groups(), state.openListId, choice)) return true;
    try {
      const board = { id: state.gameId, ownerId: state.gameOwnerId, openListId: state.openListId, showInOpenBoards: state.showInOpenBoards };
      const { listId, created } = await this.gameGroups.saveChoice(board, choice);
      state.openListId = listId;
      if (created) this.groups.update(groups => [...groups, created]);
      return true;
    } catch {
      this.toastService.warning('Saved, but the group could not be changed. Try again in a moment.');
      return false;
    }
  }

  /** The co-host's Save: the open-boards switch first, then the group, each on its own. */
  public async saveCoHostEdit(shown: boolean, choice: GroupChoice | undefined): Promise<void> {
    const state = this.state;
    this.saving.set(true);
    try {
      if (shown !== state.showInOpenBoards) {
        state.openListId = await this.gameService.setShowInOpenBoards({ id: state.gameId, ownerId: state.gameOwnerId, openListId: state.openListId }, shown);
        state.showInOpenBoards = shown;
      }
      if (await this.saveChoice(choice)) this.coHostEditOpen.set(false);
    } catch {
      this.toastService.error('Could not save the game. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  private readonly gameGroups: GameGroupsService = inject(GameGroupsService);
  private readonly gameService: GameService = inject(GameService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly toastService: ToastService = inject(ToastService);
}
