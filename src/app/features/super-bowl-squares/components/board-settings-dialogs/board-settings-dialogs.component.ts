import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlanService } from '../../../../core/services/plan.service';
import { autoRunLabel } from '../../../../core/utils/auto-manage';
import { CoHostEditDialogComponent } from '../cohost-edit-dialog/cohost-edit-dialog.component';
import { EditGameDialogComponent } from '../edit-game-dialog/edit-game-dialog.component';
import { EditGameNumbersComponent } from '../edit-game-numbers/edit-game-numbers.component';
import { GamePageGroupsService } from '../../services/game-page-groups.service';
import { ShrinkBoardDialogComponent } from '../shrink-board-dialog/shrink-board-dialog.component';
import { UpgradePassDialogComponent } from '../../../dashboard/components/upgrade-pass-dialog/upgrade-pass-dialog.component';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';

/** The host's board dialogs: the smaller-board suggestion on lock, Edit game, the season limit when Clear game hits it, and the co-host's Edit game. The host box adds no layout. */
@Component({
  selector: 'app-board-settings-dialogs',
  imports: [CoHostEditDialogComponent, EditGameDialogComponent, EditGameNumbersComponent, ShrinkBoardDialogComponent, UpgradePassDialogComponent],
  host: { style: 'display: contents' },
  templateUrl: './board-settings-dialogs.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BoardSettingsDialogsComponent {
  // Protected properties

  protected readonly autoRunLabel: typeof autoRunLabel = autoRunLabel;
  protected readonly groups: GamePageGroupsService = inject(GamePageGroupsService);
  protected readonly host: HostActionsService = inject(HostActionsService);
  protected readonly planService: PlanService = inject(PlanService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
