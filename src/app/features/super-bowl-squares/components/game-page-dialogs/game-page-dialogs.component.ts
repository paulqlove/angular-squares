import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { AuthModalComponent } from '../../../../components/ui/auth-modal/auth-modal.component';
import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { ShareDialogComponent } from '../../../../components/ui/share-dialog/share-dialog.component';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameStateService } from '../../services/game-state.service';
import { PlayerNameService } from '../../services/player-name.service';
import { SquarePickerService } from '../../services/square-picker.service';

/** The page's own dialogs: Share, Edit name, sign-in from a square tap, and the forced rename. The host box adds no layout. */
@Component({
  selector: 'app-game-page-dialogs',
  imports: [AuthModalComponent, FormsModule, ModalComponent, NgIconComponent, ShareDialogComponent],
  providers: [provideIcons({ heroXMark })],
  host: { style: 'display: contents' },
  templateUrl: './game-page-dialogs.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class GamePageDialogsComponent {
  // Protected properties

  protected readonly names: PlayerNameService = inject(PlayerNameService);
  protected readonly squares: SquarePickerService = inject(SquarePickerService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
