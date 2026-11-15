import { Injectable, inject, signal } from '@angular/core';

import { GameService } from '../../core/services/game.service';
import { MAX_TV_BOARDS } from '../../core/services/tv-link.service';
import { ToastService } from '../../core/services/toast.service';
import { tvLinkCopiedMessage } from './tv-link-message';

/** What a rotating TV link publishes: the boards, the seconds per board, and the group's name for the toast (null for All groups). */
export interface RotationLink {
  boardIds: string[];
  groupName: string | null;
  seconds: number;
}

/**
 * TV mode's link buttons: Copy TV link for one board, and the host's rotating TV link (copy and turn off).
 * Provided on the Present page.
 */
@Injectable()
export class PresentTvLinkService {
  /** The host has a rotating TV link on, so Turn off TV link shows. */
  public readonly hasRotationLink = signal<boolean>(false);

  /** Copies the single-board TV link. */
  public async copyBoardLink(gameId: string): Promise<void> {
    await this.copy(this.gameService.getTvLink(gameId), 'TV link copied');
  }

  /** Publishes the boards and interval under the host's private token, and copies the address. */
  public async copyRotationLink(userId: string, link: RotationLink): Promise<void> {
    let url: string;
    try {
      const token = await this.gameService.saveTvLink(userId, link.boardIds, link.seconds);
      this.hasRotationLink.set(true);
      url = this.gameService.getRotationTvLink(token);
    } catch (error) {
      console.error('[Present] Could not save the rotating TV link', (error as { code?: string })?.code ?? error);
      this.toast.error('Could not make the TV link. Try again.');
      return;
    }
    const boards = Math.min(link.boardIds.length, MAX_TV_BOARDS);
    await this.copy(url, tvLinkCopiedMessage(link.groupName, boards, link.seconds), `Could not copy. The link is ${url}`);
  }

  public async load(userId: string): Promise<void> {
    this.hasRotationLink.set(!!(await this.gameService.getTvToken(userId)));
  }

  /** The old address stops working and the next link gets a new token. */
  public async turnOff(userId: string): Promise<void> {
    try {
      await this.gameService.removeTvLink(userId);
      this.hasRotationLink.set(false);
      this.toast.success('TV link turned off.');
    } catch {
      this.toast.error('Could not turn the link off. Try again.');
    }
  }

  private readonly gameService: GameService = inject(GameService);
  private readonly toast: ToastService = inject(ToastService);

  private async copy(url: string, done: string, failed = 'Could not copy. Open the board and copy the address bar.'): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success(done);
    } catch {
      this.toast.error(failed);
    }
  }
}
