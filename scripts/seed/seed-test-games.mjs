#!/usr/bin/env node
// Seeds 20 test boards into the live Realtime Database: 10 hosted by each of two accounts, in a mix of sizes and
// states, with made-up players. Every board is tagged seed: true so cleanup-test-games.mjs can remove exactly these.
//
//   node seed-test-games.mjs --paul <email> --eric <email>            dry run: prints what it would write
//   node seed-test-games.mjs --paul <email> --eric <email> --write    writes it
//
// Emails are passed in, never stored in the repo. See README.md for the login this needs.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const PROJECT_ID = 'squares-4e4f7';
const DATABASE_URL = 'https://squares-4e4f7-default-rtdb.firebaseio.com';
const SEED_TAG = `seed-${new Date().toISOString().slice(0, 10)}`;

const args = parseArgs(process.argv.slice(2));
if (!args.paul || (!args.eric && !args.extra)) {
  console.error('Usage: node seed-test-games.mjs --paul <email> --eric <email> [--write]   (or --paul <email> --extra [--write] for five more boards for one account)');
  process.exit(1);
}
const WRITE = !!args.write;

// The cast: made-up players, first name plus last initial, so boards read like a real group
const PLAYERS = [
  'Mike R', 'Jen T', 'Carlos M', 'Dana W', 'Big Steve', 'Priya K', 'Tommy B', 'Lauren P', 'Andre J', 'Kelsey H',
  'Uncle Ray', 'Sam O', 'Nicole F', 'Derek L', 'Grandma Jo', 'Marcus D', 'Becca S', 'Tyler G', 'Aunt Linda', 'Jamal C',
  'Hannah V', 'Coach Bill', 'Rosa N', 'Kevin Z', 'Megan A', 'DJ', 'Olivia E', 'Frank the Tank', 'Tasha Y', 'Luis Q',
  'Brianna U', 'Pete X', 'Cousin Eddie', 'Wendy I', 'Victor K', 'Ally M', 'Chris P', 'Stacy R', 'Hector B', 'Jules T'
];
const COLORS = ['qs-p-rose', 'qs-p-sky', 'qs-p-butter', 'qs-p-lilac', 'qs-p-coral', 'qs-p-aqua', 'qs-p-orchid', 'qs-p-apricot', 'qs-p-periwinkle', 'qs-p-tan'];

// state: filling | ready (full, not locked) | locked (numbers drawn, not started) | live (scores through `period`) | final
// link: true links the board to a real upcoming ESPN game (filling boards only), so it shows a live matchup
const PLAN = {
  paul: [
    { name: 'Front Office Football Club', size: 100, state: 'filling', fill: 0.42, link: 'nfl' },
    { name: 'Sunday Couch Crew', size: 100, state: 'filling', fill: 0.71, link: 'nfl' },
    { name: 'Turkey Day Showdown', size: 50, state: 'filling', fill: 0.18, teams: ['NYG', 'DAL'] },
    { name: 'The Waffle House Crew', size: 25, state: 'ready', fill: 1, teams: ['ATL', 'NO'] },
    { name: 'Hilltop Fantasy League', size: 100, state: 'ready', fill: 1, teams: ['SF', 'SEA'] },
    { name: 'Monday Night Regulars', size: 100, state: 'locked', fill: 0.86, teams: ['BAL', 'PIT'] },
    { name: 'Rivalry Week Bash', size: 50, state: 'live', period: 3, fill: 0.92, teams: ['GB', 'CHI'] },
    { name: 'Cul-de-sac Commissioners', size: 25, state: 'final', fill: 0.88, teams: ['DEN', 'LV'] },
    { name: 'Tailgate Lot B', size: 100, state: 'final', fill: 0.95, teams: ['BUF', 'MIA'] },
    { name: 'Bowl Season Warmup', size: 50, state: 'filling', fill: 0.54, teams: ['OSU', 'MICH'] }
  ],
  eric: [
    { name: 'Garage Gym Gridiron', size: 100, state: 'filling', fill: 0.27, link: 'nfl' },
    { name: 'Second Shift Squares', size: 100, state: 'filling', fill: 0.63, link: 'ncaaf' },
    { name: 'Lake House Legends', size: 50, state: 'filling', fill: 0.40, teams: ['MIN', 'DET'] },
    { name: 'Pub Trivia Tuesday Crew', size: 25, state: 'ready', fill: 1, teams: ['KC', 'LAC'] },
    { name: 'Dad Bod Fantasy League', size: 100, state: 'locked', fill: 0.78, teams: ['CIN', 'CLE'] },
    { name: 'Book Club Goes Long', size: 50, state: 'live', period: 2, fill: 0.90, teams: ['PHI', 'WSH'] },
    { name: 'The Old Neighborhood', size: 100, state: 'live', period: 4, fill: 0.97, teams: ['LAR', 'ARI'] },
    { name: 'Saturday Tailgaters', size: 100, state: 'final', fill: 1, teams: ['BAMA', 'AUB'] },
    { name: 'Group Chat Champions', size: 25, state: 'final', fill: 0.84, teams: ['HOU', 'IND'] },
    { name: 'Wing Night Wizards', size: 50, state: 'filling', fill: 0.12, teams: ['TB', 'CAR'] }
  ]
};

// --extra: five more boards for the first account only
const EXTRA = {
  paul: [
    { name: 'Thursday Night Lights Crew', size: 100, state: 'filling', fill: 0.35, teams: ['PIT', 'CLE'] },
    { name: 'Office Chili Cook-Off Squares', size: 50, state: 'filling', fill: 0.62, teams: ['DAL', 'PHI'] },
    { name: 'Neighborhood Block Party', size: 100, state: 'ready', fill: 1, teams: ['GB', 'MIN'] },
    { name: 'Fourth and Long Society', size: 25, state: 'locked', fill: 0.84, teams: ['SF', 'LAR'] },
    { name: 'Sunday Funday Regulars', size: 100, state: 'live', period: 3, fill: 0.93, teams: ['KC', 'DEN'] }
  ]
};

// Cumulative scores at the end of each quarter, for live and final boards
const SCORE_LINES = [
  [[7, 3], [14, 10], [17, 20], [24, 27]],
  [[0, 7], [10, 14], [20, 14], [31, 21]],
  [[3, 0], [13, 6], [16, 13], [23, 16]],
  [[7, 7], [14, 17], [21, 24], [28, 30]],
  [[10, 0], [17, 3], [24, 10], [27, 19]]
];
const PRICES = [1, 2, 5, 10];

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID, databaseURL: DATABASE_URL });
const auth = getAuth();
const db = getDatabase();

const owners = {};
for (const key of args.extra ? ['paul'] : ['paul', 'eric']) {
  const user = await auth.getUserByEmail(args[key]).catch(err => {
    console.error(`No account found for the ${key} email (${err.code || err.message}). Nothing was written.`);
    process.exit(1);
  });
  owners[key] = { uid: user.uid, name: user.displayName || args[key].split('@')[0] };
  console.log(`${key}: ${owners[key].name} (uid ${user.uid})`);
}

const upcoming = { nfl: await upcomingGames('nfl'), ncaaf: await upcomingGames('ncaaf') };
const taken = new Set((await db.ref('games').once('value').then(s => Object.keys(s.val() || {})).catch(() => [])));

const updates = {};
let n = 0;
for (const [key, boards] of Object.entries(args.extra ? EXTRA : PLAN)) {
  const owner = owners[key];
  for (const plan of boards) {
    const id = newBoardId(taken);
    const game = buildGame(plan, owner, n++);
    if (plan.link) {
      const espn = upcoming[plan.link].shift();
      if (espn) {
        game.espnEventId = espn.id;
        game.espnSport = plan.link;
        game.homeTeam = espn.home;
        game.awayTeam = espn.away;
        updates[`liveGames/${espn.id}/${id}`] = { sport: plan.link };
      } else {
        // No upcoming game on ESPN right now: keep it unlinked with a fixed matchup
        [game.awayTeam, game.homeTeam] = plan.link === 'ncaaf' ? ['UGA', 'TENN'] : ['NYJ', 'NE'];
      }
    }
    // The app reads picks from `squares`, not `selectedSquares`
    const { selectedSquares, ...rest } = game;
    updates[`games/${id}`] = { id, ...rest, squares: selectedSquares };
    updates[`users/${owner.uid}/games/${id}`] = { createdAt: game.createdAt, name: game.name };
    updates[`openBoards/${owner.uid}/${id}`] = true;
    const picked = Object.keys(selectedSquares).length;
    console.log(`  ${id}  ${key.padEnd(4)}  ${String(plan.size).padStart(3)}  ${plan.state.padEnd(7)}  ${String(picked).padStart(3)}/${plan.size}  ${game.awayTeam} @ ${game.homeTeam}${game.espnEventId ? ' (ESPN ' + game.espnEventId + ')' : ''}  ${game.name}`);
  }
}

console.log(`\n${Object.keys(updates).length} paths, tag ${SEED_TAG}.`);
if (!WRITE) {
  console.log('Dry run: nothing was written. Add --write to write it.');
  process.exit(0);
}
await db.ref().update(updates);
console.log('Written. Remove these boards with: node cleanup-test-games.mjs --write');
process.exit(0);

function buildGame(plan, owner, index) {
  const rows = plan.size === 100 ? 10 : 5;
  const cols = plan.size === 25 ? 5 : 10;
  const createdAt = Date.now() - (20 - index) * 3600_000;
  const cells = shuffle(Array.from({ length: rows * cols }, (_, i) => `${Math.floor(i / cols)}-${i % cols}`));
  const count = plan.fill >= 1 ? cells.length : Math.min(cells.length - 1, Math.max(1, Math.round(cells.length * plan.fill)));
  // A group of 8 to 16 people, each taking a few squares; a few take more, like a real pool
  const group = shuffle([...PLAYERS]).slice(0, 8 + (index % 9));
  const selectedSquares = {};
  cells.slice(0, count).forEach((cell, i) => {
    // Everyone gets at least one square; after that the first few names in the group take more
    selectedSquares[cell] = i < group.length ? group[i] : group[Math.floor(Math.random() ** 1.6 * group.length)];
  });
  const playerColors = {};
  [...new Set(Object.values(selectedSquares))].forEach((name, i) => (playerColors[name] = COLORS[i % COLORS.length]));

  const locked = ['locked', 'live', 'final'].includes(plan.state);
  const homeNumbers = locked ? shuffle(range(cols)) : Array(cols).fill(null);
  const awayNumbers = locked ? shuffle(range(rows)) : Array(rows).fill(null);
  const scores = { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } };
  const winners = {};
  let espnLive;
  if (plan.state === 'live' || plan.state === 'final') {
    const line = SCORE_LINES[index % SCORE_LINES.length];
    const played = plan.state === 'final' ? 4 : plan.period - 1;
    ['q1', 'q2', 'q3', 'q4'].forEach((q, i) => {
      if (i >= played) return;
      scores[q] = { away: line[i][0], home: line[i][1] };
      const winner = winnerFor(scores[q], selectedSquares, homeNumbers, awayNumbers);
      if (winner) winners[q] = winner;
    });
    // Live boards show the running score of the quarter being played
    const now = plan.state === 'final' ? line[3] : line[plan.period - 1];
    const before = played > 0 ? line[played - 1] : [0, 0];
    const quarters = line.slice(0, plan.state === 'final' ? 4 : plan.period).map((q, i) => {
      const prev = i > 0 ? line[i - 1] : [0, 0];
      return { away: q[0] - prev[0], home: q[1] - prev[1] };
    });
    espnLive = {
      status: plan.state === 'final' ? 'post' : 'in',
      period: plan.state === 'final' ? 4 : plan.period,
      clock: plan.state === 'final' ? '0:00' : '6:42',
      completed: plan.state === 'final',
      awayScore: plan.state === 'final' ? now[0] : before[0] + Math.round((now[0] - before[0]) / 2),
      homeScore: plan.state === 'final' ? now[1] : before[1] + Math.round((now[1] - before[1]) / 2),
      awayTeam: plan.teams?.[0] || '',
      homeTeam: plan.teams?.[1] || '',
      quarters
    };
  }

  return {
    name: plan.name,
    ownerId: owner.uid,
    ownerName: owner.name,
    createdAt,
    boardSize: plan.size,
    selectedSquares,
    playerColors,
    homeNumbers,
    awayNumbers,
    scores,
    winners,
    isLocked: locked,
    isRandomized: locked,
    pricePerSquare: PRICES[index % PRICES.length],
    awayTeam: plan.teams?.[0] || '',
    homeTeam: plan.teams?.[1] || '',
    hostNote: '',
    paidPlayers: [],
    emptyQuarterRule: 'final',
    showInOpenBoards: true,
    ...(espnLive ? { espnLive } : {}),
    seed: true,
    seedTag: SEED_TAG
  };
}

/** The square whose row and column numbers match the last digits of the score. 5-wide axes hold pairs (0 = 0 and 1). */
function winnerFor(score, squares, homeNumbers, awayNumbers) {
  const match = (digit, stored, paired) => (paired ? Math.floor(digit / 2) === stored : digit === stored);
  const row = awayNumbers.findIndex(n => match(score.away % 10, n, awayNumbers.length === 5));
  const col = homeNumbers.findIndex(n => match(score.home % 10, n, homeNumbers.length === 5));
  return row !== -1 && col !== -1 ? squares[`${row}-${col}`] || null : null;
}

async function upcomingGames(sport) {
  const path = sport === 'ncaaf' ? 'college-football' : 'nfl';
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/${path}/scoreboard`);
    const data = await res.json();
    return (data.events || [])
      .filter(e => e.status?.type?.state === 'pre')
      .map(e => {
        const c = e.competitions?.[0]?.competitors || [];
        const team = side => c.find(x => x.homeAway === side)?.team?.abbreviation || '';
        return { id: String(e.id), home: team('home'), away: team('away') };
      })
      .filter(g => /^[A-Za-z0-9_-]{1,50}$/.test(g.id) && g.home && g.away);
  } catch {
    return [];
  }
}

function newBoardId(taken) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do {
    id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (taken.has(id));
  taken.add(id);
  return id;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') out.write = true;
    else if (a === '--extra') out.extra = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}
