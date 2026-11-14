import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getApps, initializeApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';
import { environment } from '../../../environments/environment';

/**
 * The one Realtime Database handle that GameService and its helper services share.
 * Lazy init required for SSR hydration - see CLAUDE.md "SSR Hydration Pattern".
 */
@Injectable({
  providedIn: 'root'
})
export class GameDatabaseService {
  /** The database. Throws outside the browser, so check isBrowser first. */
  public get db(): Database {
    if (!this._db && this.isBrowser) {
      let app;
      if (getApps().length === 0) {
        app = initializeApp(environment.firebase);
      } else {
        app = getApps()[0];
      }
      this._db = getDatabase(app, environment.firebase.databaseURL);
    }
    if (!this._db) {
      throw new Error('[GameService] Database not available - not in browser context');
    }
    return this._db;
  }

  public get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private _db: Database | null = null;
  private readonly platformId: object = inject(PLATFORM_ID);
}
