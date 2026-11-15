import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroLockClosed, heroLockOpen, heroPencilSquare, heroSparkles, heroSquares2x2, heroUsers } from '@ng-icons/heroicons/outline';
import { GamePageGroupsService } from '../../services/game-page-groups.service';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GamePlayersService } from '../../services/game-players.service';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';
import { HostNextStep, hostNextStep } from '../../utils/host-next-step';

/**
 * The floating host bar's toolbar. Phones: Games (opens Your games), one next-step button (Lock, Draw, Unlock), Players
 * and Edit; a co-host gets Games and Players, plus Edit once the owner has a group. Larger screens: Lock and draw, Draw or Clear numbers, Manage players and Edit
 * game. It renders inside the page's `.qs-dockable` element, so the bar keeps the element the dock styles and directive expect.
 */
@Component({
  selector: 'div[appHostToolbar]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowPath, heroLockClosed, heroLockOpen, heroPencilSquare, heroSparkles, heroSquares2x2, heroUsers })],
  templateUrl: './host-toolbar.component.html',
  styleUrls: ['./host-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HostToolbarComponent {
  // Protected properties

  protected readonly groups: GamePageGroupsService = inject(GamePageGroupsService);
  protected readonly host: HostActionsService = inject(HostActionsService);
  protected readonly nextStepLabel: Record<HostNextStep, string> = { draw: 'Draw', lock: 'Lock', unlock: 'Unlock' };
  protected readonly players: GamePlayersService = inject(GamePlayersService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);

  protected get nextStep(): HostNextStep {
    return hostNextStep(this.state.isLocked, this.state.isRandomized);
  }
}
