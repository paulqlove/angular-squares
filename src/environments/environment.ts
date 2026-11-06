export const environment = {
  production: false,
  // Leave false until the Cloud Function is deployed. Then set true and
  // redeploy hosting so browsers stop writing ESPN scores. See docs/FUNCTIONS.md.
  serverScoring: false,
  // Placeholder only. "See demo" links here and does not create a Firebase game.
  demoGameId: 'DEMO00',
  // Free hosts' boards show an ad slot. Off until an ad network is set up; the admin still sees a placeholder.
  adsEnabled: false,
  firebase: {
    apiKey: 'AIzaSyBij6Rm7noCjgQVLvclvqRc34UtY2wQLsE',
    authDomain: 'squares-4e4f7.firebaseapp.com',
    databaseURL: 'https://squares-4e4f7-default-rtdb.firebaseio.com',
    projectId: 'squares-4e4f7',
    storageBucket: 'squares-4e4f7.firebasestorage.app',
    messagingSenderId: '138190069880',
    appId: '1:138190069880:web:57e20b7d6db4112b3c0d8d',
    measurementId: 'G-7WCZ6QZVH4'
  }
}; 