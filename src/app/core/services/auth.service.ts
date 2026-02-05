import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  updateProfile,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { Database, getDatabase, ref, set, get } from 'firebase/database';
import { environment } from '../../../environments/environment';
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
  private _authInitialized = false;
  private _authReadyPromise: Promise<void> | null = null;
  private _authReadyResolve: (() => void) | null = null;
  private _currentUser = signal<AuthUser | null>(null);
  private _isLoading = signal<boolean>(true);
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
    if (!this._auth && this.isBrowser) {
      if (getApps().length === 0) {
        initializeApp(environment.firebase);
      }
      this._auth = getAuth();
      // Set persistence to local storage so auth survives page refresh
      setPersistence(this._auth, browserLocalPersistence);
    }
    if (!this._auth) {
      throw new Error('[AuthService] Auth not available - not in browser context');
    }
    return this._auth;
  }

  private get db(): Database {
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
      throw new Error('[AuthService] Database not available - not in browser context');
    }
    return this._db;
  }

  constructor() {
    if (this.isBrowser) {
      this._authReadyPromise = new Promise((resolve) => {
        this._authReadyResolve = resolve;
      });
      this.initializeAuthState();
    } else {
      // Keep isLoading true during SSR so server renders the loading spinner
      // This prevents flash of welcome page before client hydration
      this._authReadyPromise = Promise.resolve();
    }
  }

  // Wait for auth state to be determined (for route guards)
  waitForAuthReady(): Promise<void> {
    return this._authReadyPromise || Promise.resolve();
  }

  private initializeAuthState(): void {
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

    // Listen for Firebase auth state changes
    onAuthStateChanged(this.auth, async (user) => {
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
          await signInAnonymously(this.auth);
          // onAuthStateChanged will fire again with the anonymous user
          return;
        } catch {
          // Fall back to cookie-only guest if anonymous auth fails
        }
      } else if (!user) {
        this._currentUser.set(null);
      }

      // Resolve the auth ready promise
      if (this._authReadyResolve) {
        this._authReadyResolve();
        this._authReadyResolve = null;
      }
    });
  }

  // Google Sign In
  async signInWithGoogle(): Promise<AuthUser> {
    this._isLoading.set(true);
    this._authError.set(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
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

  // Email/Password Sign Up
  async signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    this._isLoading.set(true);
    this._authError.set(null);

    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);

      // Update display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName || result.user.email,
        photoURL: null,
        isGuest: false
      };

      this._currentUser.set(authUser);
      this.clearGuestCookie();
      // Index email for manager lookup
      if (email) {
        this.indexUserEmail(email, result.user.uid);
      }
      return authUser;
    } catch (error: any) {
      this._authError.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Email/Password Sign In
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    this._isLoading.set(true);
    this._authError.set(null);

    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const user = result.user;

      const authUser: AuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL,
        isGuest: false
      };

      this._currentUser.set(authUser);
      this.clearGuestCookie();
      // Index email for manager lookup
      if (email) {
        this.indexUserEmail(email, user.uid);
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
      const result = await signInAnonymously(this.auth);
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
    const currentUser = this._currentUser();
    if (!currentUser || currentUser.isGuest) return;

    const sanitizedName = this.sanitizationService.sanitizeDisplayName(name);
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      await updateProfile(firebaseUser, { displayName: sanitizedName });
      this._currentUser.set({
        ...currentUser,
        displayName: sanitizedName
      });
    }
  }

  // Sign Out
  async signOut(): Promise<void> {
    this._isLoading.set(true);

    try {
      const currentUser = this._currentUser();

      if (currentUser?.isGuest) {
        this.clearGuestCookie();
      }

      // Always sign out of Firebase (guests now have anonymous sessions too)
      if (this.auth.currentUser) {
        await signOut(this.auth);
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
    const sanitized = this.sanitizeEmailForKey(email);
    const emailRef = ref(this.db, `emailIndex/${sanitized}`);
    await set(emailRef, uid);
  }

  async lookupUserByEmail(email: string): Promise<string | null> {
    if (!this.isBrowser || !email) return null;
    const sanitized = this.sanitizeEmailForKey(email);
    const emailRef = ref(this.db, `emailIndex/${sanitized}`);
    const snapshot = await get(emailRef);
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
