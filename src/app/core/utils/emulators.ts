import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';

/** Local Firebase emulators for development (npm run start:emulators). Never used when environment.useEmulators is false. */
export const EMULATOR_HOST = '127.0.0.1';
export const AUTH_EMULATOR_PORT = 9099;
export const DATABASE_EMULATOR_PORT = 9000;

const connected = new WeakSet<object>();

/** Points the Auth instance at the emulator, once. Must run before the first sign-in. */
export function connectAuthOnce(auth: Auth, connect: (auth: Auth, url: string, options?: { disableWarnings: boolean }) => void): void {
  if (connected.has(auth)) return;
  connected.add(auth);
  connect(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, { disableWarnings: true });
}

/** Points the Database instance at the emulator, once. Must run before the first read or write. */
export function connectDatabaseOnce(db: Database, connect: (db: Database, host: string, port: number) => void): void {
  if (connected.has(db)) return;
  connected.add(db);
  connect(db, EMULATOR_HOST, DATABASE_EMULATOR_PORT);
}

/** A fake Google ID token the Auth emulator accepts, for signing in as a made-up person. */
export function fakeGoogleToken(email: string, name: string): string {
  return JSON.stringify({ sub: `dev-${email}`, email, email_verified: true, name });
}
