import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Database, get, getDatabase, ref } from 'firebase/database';
import { environment } from '../../../environments/environment';
import { canViewLegacyMoney, ownerEntryPath } from '../owner-gate';

/**
 * Reads owners/{currentUid} only. The node is written from the Firebase console.
 * No account id is compiled into this file.
 */
@Injectable({
  providedIn: 'root'
})
export class OwnerGateService {
  private platformId = inject(PLATFORM_ID);
  private _db: Database | null = null;
  private loadedUid: string | null = null;
  private ownOwnerFlag: unknown = false;

  readonly allowlisted = signal(false);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get db(): Database {
    if (!this._db && this.isBrowser) {
      const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
      this._db = getDatabase(app, environment.firebase.databaseURL);
    }
    if (!this._db) {
      throw new Error('[OwnerGateService] Database not available');
    }
    return this._db;
  }

  async refresh(): Promise<boolean> {
    if (!this.isBrowser || getApps().length === 0) {
      this.clear();
      return false;
    }

    let uid: string | null = null;
    try {
      uid = getAuth().currentUser?.uid ?? null;
    } catch {
      this.clear();
      return false;
    }

    if (!uid) {
      this.clear();
      return false;
    }

    if (this.loadedUid === uid) {
      return this.allowlisted();
    }

    const snapshot = await get(ref(this.db, ownerEntryPath(uid)));
    this.loadedUid = uid;
    this.ownOwnerFlag = snapshot.exists() ? snapshot.val() : false;
    const allowed = this.ownOwnerFlag === true;
    this.allowlisted.set(allowed);
    return allowed;
  }

  canSeeGame(gameCreatorUid: string | null | undefined): boolean {
    return canViewLegacyMoney({
      currentUid: this.loadedUid,
      gameCreatorUid,
      ownOwnerFlag: this.ownOwnerFlag
    });
  }

  private clear(): void {
    this.loadedUid = null;
    this.ownOwnerFlag = false;
    this.allowlisted.set(false);
  }
}
