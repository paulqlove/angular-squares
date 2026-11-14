import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameStateService } from '../../services/game-state.service';
import { PlayerNameService } from '../../services/player-name.service';

/** The row above the board: the game's name, the host note, the squares counter and the player's name. */
@Component({
  selector: 'div[appGameInfoBar]',
  imports: [FormsModule],
  templateUrl: './game-info-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class GameInfoBarComponent {
  // Protected properties

  /** Hands the note paragraph to the page so it can measure whether the note runs past its line. */
  @ViewChild('hostNoteEl')
  protected set hostNoteEl(el: ElementRef<HTMLElement> | undefined) {
    this.ui.hostNoteEl = el;
  }

  protected readonly names: PlayerNameService = inject(PlayerNameService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
