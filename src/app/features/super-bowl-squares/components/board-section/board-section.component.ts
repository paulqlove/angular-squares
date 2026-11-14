import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BoxScoreComponent } from '../box-score/box-score.component';
import { GameBoardComponent } from '../game-board/game-board.component';
import { OpenBoardsListComponent } from '../open-boards-list/open-boards-list.component';
import { ProbabilityHeatmapComponent } from '../probability-heatmap/probability-heatmap.component';
import { GamePageUiService } from '../../services/game-page-ui.service';
import { GameScoringService } from '../../services/game-scoring.service';
import { GameSessionService } from '../../services/game-session.service';
import { GameStateService } from '../../services/game-state.service';
import { NumberDrawService } from '../../services/number-draw.service';
import { SquarePickerService } from '../../services/square-picker.service';

/** The Board section: its head (live, open or locked, picked count), the tabs and the tab panels. */
@Component({
  selector: 'section[appBoardSection]',
  imports: [BoxScoreComponent, GameBoardComponent, OpenBoardsListComponent, ProbabilityHeatmapComponent],
  templateUrl: './board-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BoardSectionComponent {
  // Protected properties

  protected readonly draw: NumberDrawService = inject(NumberDrawService);
  protected readonly scoring: GameScoringService = inject(GameScoringService);
  protected readonly session: GameSessionService = inject(GameSessionService);
  protected readonly squares: SquarePickerService = inject(SquarePickerService);
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);
}
