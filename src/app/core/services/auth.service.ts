import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import { environment } from '../../../environments/environment';
import { loadFirebaseSdk } from './firebase-sdk';
import { SanitizationService } from './sanitization.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

export interface GuestUser {
  name: string;
  createdAt: number;
}

const GUEST_COOKIE_KEY = 'squares_guest_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private sanitizationService = inject(SanitizationService);
  // Lazy init required for SSR hydration - see CLAUDE.md "SSR Hydration Pattern"
  private _auth: Auth | null = null;
  private _db: Database | null = null;
  private sdk: Awaited<ReturnType<typeof loadFirebaseSdk>> | null = null;
  private initPromise: Promise<void> | null = null;
  private _currentUser = signal<AuthUser | null>(null);
  // Start idle so `/` can render without waiting on Firebase.
  private _isLoading = signal<boolean>(false);
  private _authError = signal<string | null>(null);

  // Public signals
  currentUser = this._currentUser.asReadonly();
  isLoading = this._isLoading.asReadonly();
  authError = this._authError.asReadonly();

  // Computed values
  isAuthenticated = computed(() => this._currentUser() !== null);
  isGuest = computed(() => this._currentUser()?.isGuest ?? false);
  canCreateGame = computed(() => {
    const user = this._currentUser();
    return user !== null && !user.isGuest;
  });

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get auth(): Auth {
    if (!this._auth) {
      throw new Error('[AuthService] Auth not available - call ensureInitialized() first');
    }
    return this._auth;
  }

  private get db(): Database {
    if (!this._db) {
      throw new Error('[AuthService] Database not available - call ensureInitialized() first');
    }
    return this._db;
  }

  /**
   * Load Firebase and resolve the current user. Not called from the landing
   * route, so visiting `/` does not download the Firebase vendor chunk.
   */
  ensureInitialized(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.resolve();
    }
    if (!this.initPromise) {
      this.initPromise = this.initializeAuthState().catch((error) => {
        this.initPromise = null;
        this._isLoading.set(false);
        throw error;
      });
    }
    return this.initPromise;
  }

  // Wait for auth state to be determined (for route guards)
  waitForAuthReady(): Promise<void> {
    return this.ensureInitialized();
  }

  /** Guest cookie only. Does not load Firebase. */
  hasGuestCookie(): boolean {
    return this.getGuestFromCookie() !== null;
  }

  private async initializeAuthState(): Promise<void> {
    const sdk = await loadFirebaseSdk();
    this.sdk = sdk;
    const { app, auth, database } = sdk;
    if (app.getApps().length === 0) {
      app.initializeApp(environment.firebase);
    }
    const firebaseApp = app.getApps()[0];
    this._auth = auth.getAuth();
    // Local persistence so auth survives a refresh. Fire-and-forget, as before.
    void auth.setPersistence(this._auth, auth.browserLocalPersistence);
    this._db = database.getDatabase(firebaseApp, environment.firebase.databaseURL);

    // Check for guest user in cookie first (show name immediately while Firebase loads)
    const guestUser = this.getGuestFromCookie();
    if (guestUser) {
      this._currentUser.set({
        uid: `guest_${guestUser.createdAt}`,
        email: null,
        displayName: guestUser.name,
        photoURL: null,
        isGuest: true
      });
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      // Listen for Firebase auth state changes
      auth.onAuthStateChanged(this._auth!, async (user) => {
        this._isLoading.set(false);
        const guest = this.getGuestFromCookie();

        if (user && user.isAnonymous && guest) {
          // Anonymous Firebase user + guest cookie = guest with Firebase auth
          this._currentUser.set({
            uid: user.uid,
            email: null,
            displayName: guest.name,
            photoURL: null,
            isGuest: true
          });
        } else if (user && !user.isAnonymous) {
          // Real Firebase user takes precedence
          this._currentUser.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isGuest: false
          });
          this.clearGuestCookie();
        } else if (!user && guest) {
          // Returning guest with cookie but no Firebase auth — sign in anonymously
          try {
            await auth.signInAnonymously(this._auth!);
            // onAuthStateChanged will fire again with the anonymous user
            return;
          } catch {
            // Fall back to cookie-only guest if anonymous auth fails
          }
        } else if (!user) {
          this._currentUser.set(null);
        }

        finish();
      });
    });
  }

  // Google Sign In
  async signInWithGoogle(): Promise<AuthUser> {
    this._authError.set(null);

    try {
      await this.ensureInitialized();
      this._isLoading.set(true);
      const provider = new this.sdk!.auth.GoogleAuthProvider();
      const result = await this.sdk!.auth.signInWithPopup(this.auth, provider);
      const user = result.user;

      const authUser: AuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isGuest: false
      };

      this._currentUser.set(authUser);
      this.clearGuestCookie();
      // Index email for manager lookup
      if (user.email) {
        this.indexUserEmail(user.email, user.uid);
      }
      return authUser;
    } catch (error: any) {
      this._authError.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Guest Sign In (cookie + Firebase Anonymous Auth)
  async signInAsGuest(name: string): Promise<AuthUser> {
    await this.ensureInitialized();
    const sanitizedName = this.sanitizationService.sanitizeDisplayName(name);
    const guestUser: GuestUser = {
      name: sanitizedName,
      createdAt: Date.now()
    };

    // Store in cookie (expires in 30 days)
    this.setGuestCookie(guestUser);

    // Sign in anonymously with Firebase so we have auth != null for DB writes
    let uid = `guest_${guestUser.createdAt}`;
    try {
      const result = await this.sdk!.auth.signInAnonymously(this.auth);
      uid = result.user.uid;
    } catch {
      // Fall back to cookie-only if anonymous auth fails
    }

    const authUser: AuthUser = {
      uid,
      email: null,
      displayName: guestUser.name,
      photoURL: null,
      isGuest: true
    };

    this._currentUser.set(authUser);
    return authUser;
  }

  // Update guest name
  updateGuestName(name: string): void {
    const currentUser = this._currentUser();
    if (currentUser?.isGuest) {
      const sanitizedName = this.sanitizationService.sanitizeDisplayName(name);
      const existingGuest = this.getGuestFromCookie();
      const guestUser: GuestUser = {
        name: sanitizedName,
        createdAt: existingGuest?.createdAt || Date.now()
      };
      this.setGuestCookie(guestUser);
      this._currentUser.set({
        ...currentUser,
        displayName: sanitizedName
      });
    }
  }

  // Update display name for Firebase users
  async updateDisplayName(name: string): Promise<void> {
    await this.ensureInitialized();
    const currentUser = this._currentUser();
    if (!currentUser || currentUser.isGuest) return;

    const sanitizedName = this.sanitizationService.sanitizeDisplayName(name);
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      await this.sdk!.auth.updateProfile(firebaseUser, { displayName: sanitizedName });
      this._currentUser.set({
        ...currentUser,
        displayName: sanitizedName
      });
    }
  }

  // Sign Out
  async signOut(): Promise<void> {
    try {
      await this.ensureInitialized();
      this._isLoading.set(true);
      const currentUser = this._currentUser();

      if (currentUser?.isGuest) {
        this.clearGuestCookie();
      }

      // Always sign out of Firebase (guests now have anonymous sessions too)
      if (this.auth.currentUser) {
        await this.sdk!.auth.signOut(this.auth);
      }

      this._currentUser.set(null);
    } finally {
      this._isLoading.set(false);
    }
  }

  // Cookie helpers
  private setGuestCookie(guestUser: GuestUser): void {
    if (!this.isBrowser) return;
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30 days
    document.cookie = `${GUEST_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(guestUser))}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }

  private getGuestFromCookie(): GuestUser | null {
    if (!this.isBrowser) return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === GUEST_COOKIE_KEY && value) {
        try {
          return JSON.parse(decodeURIComponent(value));
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private clearGuestCookie(): void {
    if (!this.isBrowser) return;
    document.cookie = `${GUEST_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // Email index helpers for manager lookup
  private sanitizeEmailForKey(email: string): string {
    return email.toLowerCase().replace(/\./g, ',');
  }

  async indexUserEmail(email: string, uid: string): Promise<void> {
    if (!this.isBrowser || !email) return;
    await this.ensureInitialized();
    const sanitized = this.sanitizeEmailForKey(email);
    const emailRef = this.sdk!.database.ref(this.db, `emailIndex/${sanitized}`);
    await this.sdk!.database.set(emailRef, uid);
  }

  async lookupUserByEmail(email: string): Promise<string | null> {
    if (!this.isBrowser || !email) return null;
    await this.ensureInitialized();
    const sanitized = this.sanitizeEmailForKey(email);
    const emailRef = this.sdk!.database.ref(this.db, `emailIndex/${sanitized}`);
    const snapshot = await this.sdk!.database.get(emailRef);
    return snapshot.exists() ? snapshot.val() : null;
  }

  // Error message helper
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}
