import { Injectable, inject } from '@angular/core';
import { get, ref, remove, set } from 'firebase/database';
import { Entitlement, NO_EXPIRY } from '../plans';
import { decodeEmailKey, encodeEmailKey } from '../utils/game-parse';
import { GameDatabaseService } from './game-database.service';

/**
 * Gifted Season Pass: an admin-only feature for granting passes to friends.
 * Passes live at giftedSeasonPass/{email key}. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class SeasonPassService {
  /** Check if an email has a gifted season pass. Returns expiry timestamp or null. */
  public async getGiftedSeasonPass(email: string): Promise<Entitlement | null> {
    if (!this.database.isBrowser || !email) return null;
    try {
      const key = encodeEmailKey(email);
      const snapshot = await get(ref(this.database.db, `giftedSeasonPass/${key}`));
      const data = snapshot.val();
      if (!data || typeof data.expiresAt !== 'number') return null;
      return { plan: 'season', expiresAt: data.expiresAt, updatedAt: data.updatedAt };
    } catch {
      return null;
    }
  }

  /** Grant a season pass to an email address. Admin only. */
  public async grantSeasonPass(email: string, durationDays: number = 210): Promise<void> {
    if (!this.database.isBrowser) throw new Error('Cannot grant pass on server');
    const key = encodeEmailKey(email);
    const now = Date.now();
    const expiresAt = now + durationDays * 86_400_000;
    await set(ref(this.database.db, `giftedSeasonPass/${key}`), {
      expiresAt,
      updatedAt: now
    });
  }

  /** List all gifted season passes. Admin only. */
  public async listGiftedSeasonPasses(): Promise<{ email: string; expiresAt: number; updatedAt?: number }[]> {
    if (!this.database.isBrowser) return [];
    try {
      const snapshot = await get(ref(this.database.db, 'giftedSeasonPass'));
      const data = snapshot.val();
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data).map(([key, value]) => {
        const v = value as { expiresAt: number; updatedAt?: number };
        return {
          email: decodeEmailKey(key),
          expiresAt: v.expiresAt,
          updatedAt: v.updatedAt
        };
      }).sort((a, b) => b.expiresAt - a.expiresAt);
    } catch {
      return [];
    }
  }

  /** Revoke a gifted season pass. Admin only. */
  public async revokeSeasonPass(email: string): Promise<void> {
    if (!this.database.isBrowser) throw new Error('Cannot revoke pass on server');
    const key = encodeEmailKey(email);
    await remove(ref(this.database.db, `giftedSeasonPass/${key}`));
  }

  /** Make a gifted season pass never expire. Admin only. */
  public async setSeasonPassNoExpiry(email: string): Promise<void> {
    if (!this.database.isBrowser) throw new Error('Cannot update pass on server');
    const key = encodeEmailKey(email);
    await set(ref(this.database.db, `giftedSeasonPass/${key}`), {
      expiresAt: NO_EXPIRY,
      updatedAt: Date.now()
    });
  }

  private readonly database: GameDatabaseService = inject(GameDatabaseService);
}
