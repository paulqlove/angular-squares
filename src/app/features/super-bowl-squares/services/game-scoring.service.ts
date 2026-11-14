import { inject, Injectable } from '@angular/core';
import { GameService } from '../../../core/services/game.service';
import type { ManualScores } from '../components/box-score/box-score.component';
import { espnWinners, manualWinners } from '../utils/board-math';
import { sameWinners } from '../utils/espn-winners';
import { GameStateService } from './game-state.service';

/** Scores the host types in, and the quarter winners worked out from the scores. */
@Injectable()
export class GameScoringService {
  // Public functions

  /** Winners of a hand-scored board. Only the owner and co-host write them; other viewers just compute them locally. */
  public calculateWinners(): void {
    const newWinners = manualWinners(this.state.board, this.state.scores);
    this.state.winners = newWinners;
    if (this.state.isHost()) {
      this.gameService.updateGame(this.state.gameId, { winners: newWinners }).catch(() => {});
    }
  }

  /**
   * Winners of an ESPN-linked board, for the quarters the feed has settled. Every sync runs on a snapshot and a write
   * starts a new snapshot, so this only writes when the winners change: rewriting the same board on every snapshot let
   * two open tabs that disagreed flip the winners back and forth.
   */
  public calculateWinnersFromEspn(currentPeriod: number, completed: boolean): void {
    const newWinners = espnWinners(this.state.board, this.state.scores, currentPeriod, completed);
    const changed = !sameWinners(this.state.winners, newWinners);
    this.state.winners = newWinners;
    if (changed) this.gameService.updateGame(this.state.gameId, { winners: newWinners });
  }

  /** The Box score tab's hand-entered scores. */
  public onBoxScoreChange(newScores: ManualScores): void {
    const scores = this.state.scores;
    scores.q1 = { home: newScores.q1.home, away: newScores.q1.away };
    scores.q2 = { home: newScores.q2.home, away: newScores.q2.away };
    scores.q3 = { home: newScores.q3.home, away: newScores.q3.away };
    scores.q4 = { home: newScores.q4.home, away: newScores.q4.away };
    this.gameService.updateGame(this.state.gameId, {
      scores: scores
    });
    this.calculateWinners();
  }

  // Private properties

  private readonly gameService: GameService = inject(GameService);
  private readonly state: GameStateService = inject(GameStateService);
}
