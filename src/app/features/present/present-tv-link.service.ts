import { Injectable, inject, signal } from '@angular/core';

import { GameService } from '../../core/services/game.service';
import { MAX_TV_BOARDS } from '../../core/utils/tv-follow';
import { ToastService } from '../../core/services/toast.service';
import { tvLinkCopiedMessage } from './tv-link-message';

/**
 * What a rotating TV link publishes: the boards, the seconds per board, and the picked group (null for All groups).
 * With a group, the TV follows it, so boards added to the group later show up on their own.
 */
export interface RotationLink {
  boardIds: string[];
  group: { id: string; name: string } | null;
  seconds: number;
}

/**
 * TV mode's link buttons: Copy TV link (one board, or the host's rotating link) and Turn off TV link.
 * Provided on the Present page.
 */
@Injectable()
export class PresentTvLinkService {
  /** The host has a rotating TV link on, so Turn off TV link shows. */
  public readonly hasRotationLink = signal<boolean>(false);

  /**
   * The Copy TV link button. While rotating, or with a group of two or more boards picked, it copies the rotating
   * link, which works signed out: the TV rotates the boards on the saved time and the arrow keys move between them.
   * Otherwise (one board, All groups while stopped, or no host account) it copies the one-board link.
   */
  public async copyTvLink(userId: string | null, boardId: string, view: RotationLink, rotating: boolean): Promise<void> {
    const showsGroup = !!view.group && view.boardIds.length >= 2;
    if (userId && (rotating || showsGroup)) await this.copyRotationLink(userId, view);
    else if (boardId) await this.copyBoardLink(boardId);
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

  /** Copies the single-board TV link. */
  private async copyBoardLink(gameId: string): Promise<void> {
    await this.copy(this.gameService.getTvLink(gameId), 'TV link copied');
  }

  /** Publishes the boards and interval under the host's private token, and copies the address. */
  private async copyRotationLink(userId: string, link: RotationLink): Promise<void> {
    let url: string;
    try {
      const token = await this.gameService.saveTvLink(userId, link.boardIds, link.seconds, link.group?.id ?? null);
      this.hasRotationLink.set(true);
      url = this.gameService.getRotationTvLink(token);
    } catch (error) {
      console.error('[Present] Could not save the rotating TV link', (error as { code?: string })?.code ?? error);
      this.toast.error('Could not make the TV link. Try again.');
      return;
    }
    const boards = Math.min(link.boardIds.length, MAX_TV_BOARDS);
    await this.copy(url, tvLinkCopiedMessage(link.group?.name ?? null, boards, link.seconds), `Could not copy. The link is ${url}`);
  }

  private async copy(url: string, done: string, failed = 'Could not copy. Open the board and copy the address bar.'): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success(done);
    } catch {
      this.toast.error(failed);
    }
  }
}
