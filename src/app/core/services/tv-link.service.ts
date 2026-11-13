import { Injectable, inject } from '@angular/core';
import { get, onValue, ref, remove, set, update } from 'firebase/database';
import { Observable } from 'rxjs';
import { TvLink } from '../utils/game-data';
import { readTvLink } from '../utils/game-parse';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';

/**
 * Share and TV links: the board link, the single-board TV link, and the rotating TV link
 * published under a random token. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class TvLinkService {
  // Rotating TV link: a random token on the host's account plus a public record of which boards to rotate.
  // The link shows boards only: no account id or name is in it.
  public getRotationTvLink(token: string): string {
    return `${this.appBaseUrl()}/tv/${token}`;
  }

  // Get shareable link for a game
  public getShareableLink(gameId: string): string {
    return `${this.appBaseUrl()}/game/${gameId}`;
  }

  // Display link for TVs and other screens: live board, no sign-in needed
  public getTvLink(gameId: string): string {
    return `${this.appBaseUrl()}/present/${gameId}`;
  }

  public async getTvToken(userId: string): Promise<string | null> {
    if (!this.database.isBrowser) return null;
    const snapshot = await get(ref(this.database.db, `users/${userId}/tvToken`));
    return snapshot.exists() ? String(snapshot.val()) : null;
  }

  /** Turn the link off: the old address stops working and the next link gets a new token. */
  public async removeTvLink(userId: string): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const token = await this.getTvToken(userId);
    if (!token) return;
    await remove(ref(this.database.db, `tvLinks/${token}`));
    await update(ref(this.database.db), { [`users/${userId}/tvToken`]: null, [`tvTokenOwners/${token}`]: null });
  }

  /** Create the host's token if needed and publish the boards and interval under it. Pressing it again updates the TVs. */
  public async saveTvLink(userId: string, boardIds: string[], interval: number): Promise<string> {
    if (!this.database.isBrowser) throw new Error('Cannot save a TV link on the server');
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    let token = await this.getTvToken(userId);
    if (!token) {
      token = this.newTvToken();
      // Claim the token for this account. The claim can never be overwritten, so only its owner can write the link.
      await update(ref(this.database.db), { [`users/${userId}/tvToken`]: token, [`tvTokenOwners/${token}`]: userId });
    }
    await set(ref(this.database.db, `tvLinks/${token}`), {
      boards: boardIds.slice(0, 20).join(','),
      interval,
      updatedAt: Date.now()
    });
    return token;
  }

  /** Live boards and interval for a TV link. null when the link is off or unknown. */
  public watchTvLink(token: string): Observable<TvLink | null> {
    return new Observable<TvLink | null>(subscriber => {
      if (!this.database.isBrowser) {
        subscriber.next(null);
        return undefined;
      }
      return onValue(
        ref(this.database.db, `tvLinks/${token}`),
        snapshot => subscriber.next(readTvLink(snapshot.val())),
        () => subscriber.next(null)
      );
    });
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);

  private appBaseUrl(): string {
    const basePath = window.location.pathname.includes('/angular-squares')
      ? '/angular-squares'
      : '';
    return `${window.location.origin}${basePath}`;
  }

  private newTvToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
