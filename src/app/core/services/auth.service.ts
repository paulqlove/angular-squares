import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Auth, User } from 'firebase/auth';
import type { Database } from 'firebase/database';
import { environment } from '../../../environments/environment';
import { loadFirebaseSdk } from './firebase-sdk';
import { markFirstTouchDone, readFirstTouch } from '../utils/first-touch';
import { connectEmailLink, connectGoogle } from '../utils/auth-link';
import { newAddressFromLink } from '../utils/link-guest';
import { SanitizationService } from './sanitization.service';
import { PREVIEW_ADMIN_EMAIL, PreviewRole, RolePreviewService } from './role-preview.service';
import { ToastService } from './toast.service';

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

const EMAIL_LINK_KEY = 'qs_email_link';
/** Set while a real account is signed in on this browser, so content pages know to restore it (see restoreSession). */
const SIGNED_IN_HINT_KEY = 'qs_signed_in';
const SEND_LINK_URL = 'https://us-central1-squares-4e4f7.cloudfunctions.net/sendSignInLink';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private sanitizationService = inject(SanitizationService);
  private rolePreview = inject(RolePreviewService);
  private toast = inject(ToastService);
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
  /** The signed-in account, ignoring any role preview. */
  realUser = this._currentUser.asReadonly();
  /** Only the preview admin can switch roles. */
  isPreviewAdmin = computed(() => {
    const user = this._currentUser();
    return !!user && !user.isGuest && user.email?.toLowerCase() === PREVIEW_ADMIN_EMAIL;
  });
  previewRole = computed<PreviewRole>(() => (this.isPreviewAdmin() ? this.rolePreview.role() : 'actual'));
  /** The user the UI should render for: the real user, or a stand-in while previewing a role. */
  currentUser = computed<AuthUser | null>(() => {
    const user = this._currentUser();
    switch (this.previewRole()) {
      case 'player':
        return { uid: 'preview-player', email: null, displayName: 'Preview Player', photoURL: null, isGuest: false };
      case 'guest':
        return { uid: 'preview-guest', email: null, displayName: 'Preview Guest', photoURL: null, isGuest: true };
      case 'signedOut':
        return null;
      default:
        return user;
    }
  });
  isLoading = this._isLoading.asReadonly();
  authError = this._authError.asReadonly();

  // Computed values
  isAuthenticated = computed(() => this.currentUser() !== null);
  isGuest = computed(() => this.currentUser()?.isGuest ?? false);
  canCreateGame = computed(() => {
    const user = this.currentUser();
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

  // Save where a brand-new account first came from, once. Older accounts are skipped
  // because their first visit is unknown. Failure never affects sign-in.
  private async saveFirstTouch(uid: string, creationTime: string | undefined): Promise<void> {
    try {
      const touch = readFirstTouch();
      if (!touch) return;
      const created = creationTime ? Date.parse(creationTime) : 0;
      if (Date.now() - created < 864e5) {
        const touchRef = this.sdk!.database.ref(this.db, `users/${uid}/firstTouch`);
        if (!(await this.sdk!.database.get(touchRef)).exists()) {
          await this.sdk!.database.set(touchRef, touch);
        }
      }
      markFirstTouchDone();
    } catch {
      // Try again on the next sign-in.
    }
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

  /**
   * Content pages (How to play, FAQ, team pages, blog) don't load Firebase for visitors. A browser that was signed in
   * last time, or holds a guest cookie, loads it here, so a refresh shows the account (Dashboard, not Create a board)
   * instead of looking signed out.
   */
  restoreSession(): void {
    if (!this.isBrowser || this.initPromise) return;
    if (!this.hasGuestCookie() && !this.readSignedInHint()) return;
    this.ensureInitialized().catch(() => {});
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
          this.writeSignedInHint(true);
          void this.saveFirstTouch(user.uid, user.metadata.creationTime);
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
        if (!user) this.writeSignedInHint(false);

        finish();
      });
    });
  }

  /** True (and warns) when a role preview should stop a write. Owner preview and no preview write normally. */
  blockPreviewWrite(): boolean {
    const role = this.previewRole();
    if (role === 'actual' || role === 'owner') return false;
    this.toast.warning('Preview only. Nothing was saved.');
    this.toast.muteErrors(1500);
    return true;
  }

  // Google Sign In
  async signInWithGoogle(): Promise<AuthUser> {
    if (this.previewRole() !== 'actual') {
      this.toast.warning('Switch the preview back to "Me" before signing in.');
      throw new Error('Sign-in is disabled while previewing a role');
    }
    this._authError.set(null);

    try {
      await this.ensureInitialized();
      this._isLoading.set(true);
      const sdkAuth = this.sdk!.auth;
      const provider = new sdkAuth.GoogleAuthProvider();
      // A guest keeps their account (and so their squares): Google is attached to it instead of replacing it.
      const outcome = await connectGoogle(sdkAuth, this.auth, {
        link: guest => sdkAuth.linkWithPopup(guest, provider),
        signIn: () => sdkAuth.signInWithPopup(this.auth, provider)
      });
      const user = outcome.result.user;
      if (outcome.linked) await this.adoptProviderProfile(user);

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

  /** Emails a one-time sign-in link (no password). Remembers the email, name and where to go next on this device. */
  async sendEmailLink(email: string, name: string, next: string): Promise<void> {
    if (this.previewRole() !== 'actual') {
      this.toast.warning('Switch the preview back to "Me" before signing in.');
      throw new Error('Sign-in is disabled while previewing a role');
    }
    // Our Cloud Function sends a branded email from quarterscore.com (Firebase's built-in one can't be customized).
    const response = await fetch(SEND_LINK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { email } })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      throw new Error(body.error?.message || "We couldn't send the link. Check the email and try again.");
    }
    localStorage.setItem(EMAIL_LINK_KEY, JSON.stringify({ email, name, next }));
  }

  /** The email, name and next page saved when the link was sent from this device, if any. */
  pendingEmailLink(): { email: string; name: string; next: string } | null {
    try {
      return JSON.parse(localStorage.getItem(EMAIL_LINK_KEY) || 'null');
    } catch {
      return null;
    }
  }

  async isEmailLink(url: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.sdk!.auth.isSignInWithEmailLink(this.auth, url);
  }

  /** Finishes sign-in from the emailed link. Sets the display name if the account has none. */
  async completeEmailLink(email: string, name: string, url: string): Promise<AuthUser> {
    await this.ensureInitialized();
    // A guest keeps their account when the address is new; an address that already has an account just signs in.
    const { result } = await connectEmailLink(this.sdk!.auth, this.auth, email, url, !newAddressFromLink(url));
    const user = result.user;
    const displayName = user.displayName || this.sanitizationService.sanitizeDisplayName(name) || null;
    if (!user.displayName && displayName) {
      await this.sdk!.auth.updateProfile(user, { displayName });
    }
    const authUser: AuthUser = { uid: user.uid, email: user.email, displayName, photoURL: user.photoURL, isGuest: false };
    this._currentUser.set(authUser);
    this.clearGuestCookie();
    localStorage.removeItem(EMAIL_LINK_KEY);
    if (user.email) this.indexUserEmail(user.email, user.uid);
    return authUser;
  }

  /** After Google is attached to a guest account, copy the Google name and photo onto the account itself. */
  private async adoptProviderProfile(user: User): Promise<void> {
    try {
      await user.reload();
      const google = user.providerData.find(p => p.providerId === 'google.com');
      const displayName = user.displayName || google?.displayName || null;
      const photoURL = user.photoURL || google?.photoURL || null;
      if (displayName !== user.displayName || photoURL !== user.photoURL) {
        await this.sdk!.auth.updateProfile(user, { displayName, photoURL });
      }
    } catch {
      // The account is linked either way; the name and photo fill in on the next sign-in.
    }
  }

  // Guest Sign In (cookie + Firebase Anonymous Auth)
  async signInAsGuest(name: string): Promise<AuthUser> {
    if (this.previewRole() !== 'actual') {
      this.toast.warning('Switch the preview back to "Me" before signing in.');
      throw new Error('Sign-in is disabled while previewing a role');
    }
    await this.ensureInitialized();
    const sanitizedName = this.sanitizationService.sanitizeDisplayName(name);
    const guestUser: GuestUser = {
      name: sanitizedName,
      createdAt: Date.now()
    };

    // Without a Firebase account the rules refuse every pick, so a refused guest sign-in
    // (Firebase allows 100 new accounts an hour per network) fails here instead of joining read-only.
    const result = await this.sdk!.auth.signInAnonymously(this.auth);
    this.setGuestCookie(guestUser);

    const authUser: AuthUser = {
      uid: result.user.uid,
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

  /** Signs out for real and returns true. While previewing a role it does nothing and returns false. */
  async signOut(): Promise<boolean> {
    if (this.previewRole() !== 'actual') {
      this.toast.warning('Preview only. Switch back to "Me" to really sign out.');
      return false;
    }
    try {
      await this.ensureInitialized();
      this._isLoading.set(true);

      // Always, not only for guests: a guest cookie left from earlier would sign
      // this browser straight back in as that guest and keep it on the dashboard.
      this.clearGuestCookie();

      // Always sign out of Firebase (guests now have anonymous sessions too)
      if (this.auth.currentUser) {
        await this.sdk!.auth.signOut(this.auth);
      }

      this._currentUser.set(null);
      return true;
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

  private readSignedInHint(): boolean {
    try {
      return localStorage.getItem(SIGNED_IN_HINT_KEY) === '1';
    } catch {
      return false;
    }
  }

  private writeSignedInHint(signedIn: boolean): void {
    try {
      if (signedIn) localStorage.setItem(SIGNED_IN_HINT_KEY, '1');
      else localStorage.removeItem(SIGNED_IN_HINT_KEY);
    } catch {
      // localStorage not available
    }
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
