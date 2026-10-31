/**
 * Dynamic entry for the Firebase SDK.
 * Imported only when auth or the database is needed, so the landing route
 * does not download the Firebase vendor chunk.
 */
export function loadFirebaseSdk() {
  return Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/database'),
  ]).then(([app, auth, database]) => ({ app, auth, database }));
}
