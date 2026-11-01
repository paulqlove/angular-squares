import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Database, get, getDatabase, ref, set } from 'firebase/database';
import { environment } from '../../../environments/environment';
import { TOS_VERSION } from '../legal';
import { AuthService } from './auth.service';

const PENDING_KEY = 'qs_tos_pending';

/**
 * Stores 18+ / terms acceptance on users/{uid}/tosAcceptance.
 * DRAFT, pending legal review — the version string is the draft dated in legal.ts.
 */
@Injectable({
  providedIn: 'root'
})
export class TosService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private _db: Database | null = null;

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get db(): Database {
    if (!this._db && this.isBrowser) {
      const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
      this._db = getDatabase(app, environment.firebase.databaseURL);
    }
    if (!this._db) {
      throw new Error('[TosService] Database not available');
    }
    return this._db;
  }

  rememberPending(): void {
    if (!this.isBrowser) return;
    sessionStorage.setItem(PENDING_KEY, TOS_VERSION);
  }

  async recordAcceptance(): Promise<void> {
    if (!this.isBrowser) return;
    await this.authService.ensureInitialized();
    const uid = this.authService.currentUser()?.uid;
    if (!uid || uid.startsWith('guest_')) {
      this.rememberPending();
      return;
    }
    await set(ref(this.db, `users/${uid}/tosAcceptance`), {
      acceptedAt: Date.now(),
      version: TOS_VERSION
    });
    sessionStorage.removeItem(PENDING_KEY);
  }

  async hasCurrentAcceptance(): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.authService.ensureInitialized();
    const uid = this.authService.currentUser()?.uid;
    if (!uid || uid.startsWith('guest_')) {
      return sessionStorage.getItem(PENDING_KEY) === TOS_VERSION;
    }
    const snapshot = await get(ref(this.db, `users/${uid}/tosAcceptance`));
    const value = snapshot.val() as { acceptedAt?: unknown; version?: unknown } | null;
    return !!value
      && typeof value.acceptedAt === 'number'
      && value.version === TOS_VERSION;
  }

  async flushPending(): Promise<void> {
    if (!this.isBrowser) return;
    if (sessionStorage.getItem(PENDING_KEY) === TOS_VERSION) {
      await this.recordAcceptance();
    }
  }
}
