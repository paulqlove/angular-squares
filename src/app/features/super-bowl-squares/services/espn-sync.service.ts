import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { EspnLiveSnapshot, GameService } from '../../../core/services/game.service';
import { EspnGame, EspnService } from '../../../core/services/espn.service';
import { environment } from '../../../../environments/environment';
import { sameScores } from '../utils/espn-winners';
import { cumulativeEspnScores } from '../utils/board-math';
import { GameScoringService } from './game-scoring.service';
import { GameStateService } from './game-state.service';

/**
 * Live scores for a board linked to an ESPN game. With `environment.serverScoring` the Cloud Function writes scores and
 * this only shows `espnLive`; otherwise the host's browser polls ESPN every 30 seconds while the game is on.
 */
@Injectable()
export class EspnSyncService {
  // Public properties

  public readonly espnSyncError: WritableSignal<string | null> = signal(null);
  public readonly isSyncingEspn: WritableSignal<boolean> = signal(false);
  public readonly lastSyncTime: WritableSignal<Date | null> = signal(null);

  // Public functions

  /** A game snapshot arrived: show, fetch or sync the linked game, or drop it when the board was unlinked. */
  public onGameData(): void {
    const state = this.state;
    if (environment.serverScoring) {
      this.applyServerScoreDisplay();
      this.ensureLiveIndex();
    } else if (state.espnEventId && state.espnEventId !== state.linkedEspnGame()?.id) {
      this.fetchLinkedEspnGame();
      this.syncFromEspn();
    } else if (state.espnEventId && state.linkedEspnGame()) {
      // ESPN game already loaded — re-sync to get period-aware winners
      this.syncFromEspn();
    } else if (!state.espnEventId && state.linkedEspnGame()) {
      state.linkedEspnGame.set(null);
      this.stopPolling();
    }
  }

  /** Another board is loading: forget this one's index check and stop polling. */
  public reset(): void {
    this.liveIndexEnsuredFor = null;
    this.stopPolling();
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public async syncFromEspn(): Promise<void> {
    const state = this.state;
    if (environment.serverScoring || !state.espnEventId) return;

    this.isSyncingEspn.set(true);
    this.espnSyncError.set(null);

    try {
      const game = await this.espnService.getGame(state.espnEventId, state.espnSport);
      if (!game) {
        if (await this.recomputeWinnersIfFinal()) return;
        this.espnSyncError.set('Could not fetch game data from ESPN');
        return;
      }

      state.linkedEspnGame.set(game);
      this.lastSyncTime.set(new Date());

      // Only the host or co-host writes scores. A viewer's write is refused by the rules, but Firebase applies
      // it locally first and then rolls it back, which made the Q4 tile flicker on joined boards. Viewers keep
      // the live game info (period, clock) for display and read the stored scores and winners.
      if (!state.isHost()) {
        this.followGameStatus(game);
        return;
      }

      const newScores = cumulativeEspnScores(state.scores, game);
      const scoresChanged = !sameScores(state.scores, newScores);
      state.scores = newScores;
      if (scoresChanged) await this.gameService.updateGame(state.gameId, { scores: newScores });
      this.scoring.calculateWinnersFromEspn(game.period, game.completed);

      this.followGameStatus(game);
    } catch (error) {
      this.espnSyncError.set('Failed to sync scores from ESPN');
    } finally {
      this.isSyncingEspn.set(false);
    }
  }

  // Private properties

  private readonly espnService: EspnService = inject(EspnService);
  private finalCheckedFor: string | null = null;
  private readonly gameService: GameService = inject(GameService);
  private liveIndexEnsuredFor: string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly scoring: GameScoringService = inject(GameScoringService);
  private readonly state: GameStateService = inject(GameStateService);

  // Private functions

  private applyServerScoreDisplay(): void {
    const state = this.state;
    this.stopPolling();
    if (!state.espnEventId) {
      if (state.linkedEspnGame()) state.linkedEspnGame.set(null);
      return;
    }
    const live = state.latestEspnLive;
    if (live) {
      state.linkedEspnGame.set(this.toLinkedGame(state.espnEventId, live));
      return;
    }
    if (state.espnEventId !== state.linkedEspnGame()?.id) {
      void this.fetchLinkedEspnGame(false);
    }
  }

  private async checkLinkedEventFinal(eventId: string): Promise<void> {
    if (this.finalCheckedFor === eventId) return;
    this.finalCheckedFor = eventId;
    const final = await this.espnService.isEventFinal(eventId, this.state.espnSport);
    if (this.state.destroyed || this.state.espnEventId !== eventId) return;
    if (final === null) this.finalCheckedFor = null;
    else if (final) this.state.linkedFinalEventId.set(eventId);
  }

  private ensureLiveIndex(): void {
    const state = this.state;
    if (!state.espnEventId || !state.gameId) return;
    if (!state.isHost()) return;
    const key = `${state.gameId}:${state.espnEventId}`;
    if (this.liveIndexEnsuredFor === key) return;
    this.liveIndexEnsuredFor = key;
    this.gameService.ensureLiveGameIndex(state.gameId, state.espnEventId, state.espnSport).catch(() => {});
  }

  private async fetchLinkedEspnGame(poll: boolean = true): Promise<void> {
    const state = this.state;
    if (!state.espnEventId) return;

    const requestedId = state.espnEventId;
    const game = await this.espnService.getGame(requestedId, state.espnSport);
    if (state.destroyed || state.espnEventId !== requestedId) return;
    if (environment.serverScoring && state.latestEspnLive) return;
    state.linkedEspnGame.set(game);
    if (!game) void this.checkLinkedEventFinal(requestedId);

    if (!poll || environment.serverScoring) return;

    if (game?.status === 'in') {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  /** Stop polling once the game has ended; start when it is on. */
  private followGameStatus(game: EspnGame): void {
    if (game.status === 'post') {
      this.stopPolling();
    } else if (game.status === 'in' && !this.pollingInterval) {
      this.startPolling();
    }
  }

  /**
   * ESPN's scoreboard only lists the current week, so a finished game can stop being found there.
   * Its final scores are already saved on the board: the host's browser works the winners out from those.
   */
  private async recomputeWinnersIfFinal(): Promise<boolean> {
    const state = this.state;
    const id = state.espnEventId;
    if (!id || !state.isHost()) return false;
    const final = state.linkedFinalEventId() === id || (await this.espnService.isEventFinal(id, state.espnSport)) === true;
    if (!final || state.espnEventId !== id) return false;
    state.linkedFinalEventId.set(id);
    this.espnSyncError.set(null);
    this.scoring.calculateWinnersFromEspn(4, true);
    return true;
  }

  private startPolling(): void {
    if (environment.serverScoring || this.pollingInterval) return;
    this.pollingInterval = setInterval(() => {
      if (this.state.espnEventId && this.state.linkedEspnGame()?.status === 'in') {
        this.syncFromEspn();
      }
    }, 30000); // 30 seconds
  }

  private toLinkedGame(id: string, live: EspnLiveSnapshot): EspnGame {
    const homeTeam = live.homeTeam || this.state.homeTeam || 'Home';
    const awayTeam = live.awayTeam || this.state.awayTeam || 'Away';
    return {
      id,
      name: `${awayTeam} at ${homeTeam}`,
      homeTeam,
      awayTeam,
      homeTeamFull: homeTeam,
      awayTeamFull: awayTeam,
      homeScore: live.homeScore,
      awayScore: live.awayScore,
      period: live.period,
      clock: live.clock,
      status: live.status,
      completed: live.completed,
      quarters: live.quarters,
      date: ''
    };
  }
}
