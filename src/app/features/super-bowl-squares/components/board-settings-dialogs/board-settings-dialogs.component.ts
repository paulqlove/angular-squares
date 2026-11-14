import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlanService } from '../../../../core/services/plan.service';
import { autoRunLabel } from '../../../../core/utils/auto-manage';
import { EditGameDialogComponent } from '../edit-game-dialog/edit-game-dialog.component';
import { ShrinkBoardDialogComponent } from '../shrink-board-dialog/shrink-board-dialog.component';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';

/** The host's board dialogs: the smaller-board suggestion on lock, and Edit game. The host box adds no layout. */
@Component({
  selector: 'app-board-settings-dialogs',
  imports: [EditGameDialogComponent, ShrinkBoardDialogComponent],
  host: { style: 'display: contents' },
  templateUrl: './board-settings-dialogs.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BoardSettingsDialogsComponent {
  // Protected properties

  protected readonly autoRunLabel: typeof autoRunLabel = autoRunLabel;
  protected readonly host: HostActionsService = inject(HostActionsService);
  protected readonly planService: PlanService = inject(PlanService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
