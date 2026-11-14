import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroLockClosed, heroLockOpen, heroPencilSquare, heroSparkles, heroUsers } from '@ng-icons/heroicons/outline';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GamePlayersService } from '../../services/game-players.service';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';

/**
 * The floating host bar's toolbar: Lock and draw, Draw or Clear numbers, Manage players and Edit game. It renders
 * inside the page's `.qs-dockable` element, so the bar keeps the element the dock styles and directive expect.
 */
@Component({
  selector: 'div[appHostToolbar]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowPath, heroLockClosed, heroLockOpen, heroPencilSquare, heroSparkles, heroUsers })],
  templateUrl: './host-toolbar.component.html',
  styleUrls: ['./host-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HostToolbarComponent {
  // Protected properties

  protected readonly host: HostActionsService = inject(HostActionsService);
  protected readonly players: GamePlayersService = inject(GamePlayersService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
