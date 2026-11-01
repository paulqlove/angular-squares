export const environment = {
  production: true,
  // Cloud Functions write ESPN scores. Set false to restore browser polling.
  serverScoring: true,
  // Placeholder only. "See demo" links here and does not create a Firebase game.
  demoGameId: 'DEMO00',
  firebase: {
    apiKey: 'AIzaSyBij6Rm7noCjgQVLvclvqRc34UtY2wQLsE',
    authDomain: 'squares-4e4f7.firebaseapp.com',
    databaseURL: 'https://squares-4e4f7-default-rtdb.firebaseio.com',
    projectId: 'squares-4e4f7',
    storageBucket: 'squares-4e4f7.firebasestorage.app',
    messagingSenderId: '138190069880',
    appId: '1:138190069880:web:57e20b7d6db4112b3c0d8d',
    // TODO: GA4 measurement ID (G-XXXXXXXX) is not in this web config.
    // Firebase CLI was not authenticated, so it could not be read from
    // project squares-4e4f7. Set it from Firebase console → Project settings
    // → Your apps → SDK setup, after Google Analytics is linked.
    // Analytics does not load while this is empty.
    measurementId: ''
  }
}; 