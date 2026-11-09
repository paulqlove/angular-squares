#!/usr/bin/env node
// Fills the LOCAL Firebase emulators with a made-up owner and a few boards (npm run emulators:seed).
// It only talks to 127.0.0.1; nothing here can reach the real project.
const AUTH = 'http://127.0.0.1:9099';
const DB = 'http://127.0.0.1:9000';
const NS = 'squares-4e4f7-default-rtdb';

const people = {
  owner: { email: 'owner@example.test', name: 'Olive Owner' },
  pete: { email: 'pete@example.test', name: 'Pete Player' },
  gina: { email: 'gina@example.test', name: 'Gina Guest' }
};

async function uidFor({ email, name }) {
  const idToken = JSON.stringify({ sub: `dev-${email}`, email, email_verified: true, name });
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`, requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true })
  });
  if (!res.ok) throw new Error(`Auth emulator said ${res.status}. Is it running? (npm run emulators:start)`);
  return (await res.json()).localId;
}

async function put(path, value) {
  const res = await fetch(`${DB}/${path}.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(value) });
  if (!res.ok) throw new Error(`Database emulator said ${res.status} for ${path}`);
}

const digits = n => Array.from({ length: n }, (_, i) => i).sort(() => 0.5 - Math.random());
const dims = { 100: [10, 10], 50: [5, 10], 25: [5, 5] };

function picks(size, holders) {
  const [rows, cols] = dims[size];
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(`${r}-${c}`);
  const squares = {};
  let i = 0;
  for (const [name, count] of holders) for (let k = 0; k < count; k++) squares[cells[i++]] = name;
  return squares;
}

const colors = { 'Olive Owner': 'bg-emerald-200', 'Pete Player': 'bg-blue-200', 'Gina Guest': 'bg-amber-200' };

function board(id, owner, uids, extra) {
  const size = extra.boardSize ?? 100;
  const [rows, cols] = dims[size];
  const squares = picks(size, extra.holders);
  const names = Object.keys(colors).filter(n => Object.values(squares).includes(n));
  const drawn = !!extra.drawn;
  return {
    name: extra.name, ownerId: owner, ownerName: people.owner.name, createdAt: Date.now() - 86_400_000, boardSize: size,
    squares, isLocked: !!extra.locked, isRandomized: drawn, pricePerSquare: 10, homeTeam: 'KC', awayTeam: 'SF',
    homeNumbers: drawn ? digits(cols === 10 ? 10 : 5) : Array(cols).fill(null), awayNumbers: drawn ? digits(rows === 10 ? 10 : 5) : Array(rows).fill(null),
    playerColors: Object.fromEntries(names.map(n => [n, colors[n]])),
    playerUserIds: Object.fromEntries(names.map(n => [n, n === people.owner.name ? uids.owner : n === people.pete.name ? uids.pete : uids.gina])),
    paidPlayers: [], scores: { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } },
    winners: {}, hostNote: extra.hostNote ?? '', ...extra.fields
  };
}

const uids = { owner: await uidFor(people.owner), pete: await uidFor(people.pete), gina: await uidFor(people.gina) };
await put('', null);
await put(`admins/${uids.owner}`, true);

const boards = {
  OWN001: board('OWN001', uids.owner, uids, { name: 'Office pool', holders: [['Pete Player', 5], ['Gina Guest', 4], ['Olive Owner', 8]], hostNote: 'Snacks at halftime!', fields: { maxSquaresPerPlayer: 5, showInOpenBoards: true } }),
  OWN002: board('OWN002', uids.owner, uids, { name: 'Bar night', boardSize: 50, locked: true, drawn: true, holders: [['Pete Player', 20], ['Gina Guest', 15], ['Olive Owner', 10]] }),
  OWN003: board('OWN003', uids.owner, uids, { name: 'Family game', boardSize: 25, holders: [['Gina Guest', 3]], fields: { autoManage: { enabled: true, resize: true, runAt: Date.now() + 86_400_000 } } })
};
for (const [id, game] of Object.entries(boards)) {
  await put(`games/${id}`, game);
  await put(`users/${uids.owner}/games/${id}`, { createdAt: game.createdAt, name: game.name });
}
await put(`openBoards/${uids.owner}/OWN001`, true);

console.log('Seeded the local emulators.');
console.log(`  owner  ${people.owner.email}  (${uids.owner}) is an Admin, so every Season Pass feature is on`);
console.log('  boards OWN001 (open, limit 5, listed), OWN002 (locked and drawn), OWN003 (auto-lock on)');
console.log('Open http://localhost:4201, then in the browser console run:  await qsDevSignIn()');
