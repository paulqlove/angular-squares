import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from '../game-status/game-status.component';
import { PlayersListComponent } from '../players-list/players-list.component';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameStateService } from '../../services/game-state.service';

/** The Players section: board status and the players list, folded on phones. */
@Component({
  selector: 'section[appPlayersSection]',
  imports: [GameStatusComponent, NgIconComponent, PlayersListComponent],
  providers: [provideIcons({ heroChevronDown })],
  templateUrl: './players-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class PlayersSectionComponent {
  // Protected properties

  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
