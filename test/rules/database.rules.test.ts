import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestContext,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';

const GAME = 'game01';
const G = `games/${GAME}`;
const HOUR = 3600000;

let env: RulesTestEnvironment;

const owner = () => env.authenticatedContext('owner');
const cohost = () => env.authenticatedContext('cohost');
const player = () => env.authenticatedContext('alice');
const guest = () => env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } });
const visitor = () => env.unauthenticatedContext();

const db = (ctx: RulesTestContext) => ctx.database();
const write = (ctx: RulesTestContext, updates: Record<string, unknown>) => db(ctx).ref().update(updates);
const set = (ctx: RulesTestContext, path: string, value: unknown) => db(ctx).ref(path).set(value);
const read = (ctx: RulesTestContext, path: string) => db(ctx).ref(path).get();

function baseGame(extra: Record<string, unknown> = {}) {
  return {
    name: 'Office Pool',
    ownerId: 'owner',
    ownerName: 'Olive',
    managerId: 'cohost',
    createdAt: Date.now(),
    isLocked: false,
    isRandomized: false,
    pricePerSquare: 10,
    homeTeam: 'Home',
    awayTeam: 'Away',
    hostNote: '',
    squares: { '0-0': 'Alice', '0-1': 'Guesty', '0-2': 'Bob' },
    playerUserIds: { Alice: 'alice', Guesty: 'guest', Bob: 'bob' },
    playerColors: { Alice: 'bg-red-200', Bob: 'bg-blue-200' },
    paidPlayers: ['Alice', 'Bob'],
    scores: { q1: { home: 0, away: 0 } },
    ...extra
  };
}

async function seed(data: Record<string, unknown>): Promise<void> {
  await env.withSecurityRulesDisabled(ctx => ctx.database().ref().update(data));
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-squares',
    database: { rules: readFileSync(process.env['RULES_FILE'] ?? 'database.rules.json', 'utf8') }
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
  await seed({ [G]: baseGame() });
});

describe('reading games', () => {
  it('a signed-out visitor can read a game', async () => {
    await assertSucceeds(read(visitor(), G));
  });

  it('a signed-out visitor cannot claim a square', async () => {
    await assertFails(write(visitor(), { [`${G}/squares/5-5`]: 'Sneaky' }));
  });

  it('a signed-out visitor cannot write any game field', async () => {
    await assertFails(set(visitor(), `${G}/name`, 'Hacked'));
  });

  it('a signed-out visitor cannot create a game', async () => {
    await assertFails(set(visitor(), 'games/new001', baseGame({ ownerId: 'nobody' })));
  });
});

describe('creating games', () => {
  it('a signed-in host can create a new game', async () => {
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('a player cannot overwrite an existing game they do not own', async () => {
    await assertFails(set(player(), G, baseGame({ ownerId: 'alice' })));
  });

  it('a host cannot create a second board while their linked board is active', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'host', espnEventId: '401' }),
      'users/host/activeBoardId': 'live01'
    });
    await assertFails(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('an admin can create a second board while their linked board is active', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'host', espnEventId: '401' }),
      'users/host/activeBoardId': 'live01',
      'admins/host': true
    });
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('a host with an active pass can create a second board while their linked board is active', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'host', espnEventId: '401' }),
      'users/host/activeBoardId': 'live01',
      'entitlements/host': { plan: 'week', expiresAt: Date.now() + HOUR }
    });
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('a host with an expired pass cannot create a second board while their linked board is active', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'host', espnEventId: '401' }),
      'users/host/activeBoardId': 'live01',
      'entitlements/host': { plan: 'week', expiresAt: Date.now() - HOUR }
    });
    await assertFails(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('nobody can make themselves an admin from the app', async () => {
    await assertFails(set(env.authenticatedContext('host'), 'admins/host', true));
  });

  it('a user can read only their own admin flag', async () => {
    await seed({ 'admins/host': true });
    await assertSucceeds(read(env.authenticatedContext('host'), 'admins/host'));
    await assertFails(read(env.authenticatedContext('player'), 'admins/host'));
  });

  it('a host cannot create a second board within 48 hours of an unlinked one', async () => {
    await seed({
      'games/free01': baseGame({ ownerId: 'host', createdAt: Date.now() - HOUR }),
      'users/host/activeBoardId': 'free01'
    });
    await assertFails(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('a host can create a new board once their unlinked board is older than 48 hours', async () => {
    await seed({
      'games/free01': baseGame({ ownerId: 'host', createdAt: Date.now() - 49 * HOUR }),
      'users/host/activeBoardId': 'free01'
    });
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });

  it('a host can create a new board when their active board was deleted', async () => {
    await seed({ 'users/host/activeBoardId': 'gone01' });
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host' })));
  });
});

describe('squares', () => {
  it('a player can claim an empty square under their own name', async () => {
    await assertSucceeds(write(player(), { [`${G}/squares/3-3`]: 'Alice' }));
  });

  it('a guest can claim an empty square and register a new name in the same write', async () => {
    await assertSucceeds(write(env.authenticatedContext('newguest', { firebase: { sign_in_provider: 'anonymous' } }), {
      [`${G}/squares/4-4`]: 'Newbie',
      [`${G}/playerUserIds/Newbie`]: 'newguest'
    }));
  });

  it('a player cannot claim a square under a name that belongs to someone else', async () => {
    await assertFails(write(player(), { [`${G}/squares/3-3`]: 'Bob' }));
  });

  it('a player cannot claim a square under an unregistered name without registering it', async () => {
    await assertFails(write(player(), { [`${G}/squares/3-3`]: 'Nobody' }));
  });

  it('a player cannot overwrite someone else\'s square', async () => {
    await assertFails(write(player(), { [`${G}/squares/0-2`]: 'Alice' }));
  });

  it('a guest cannot clear someone else\'s square', async () => {
    await assertFails(write(guest(), { [`${G}/squares/0-0`]: null }));
  });

  it('a player can clear their own square', async () => {
    await assertSucceeds(write(player(), { [`${G}/squares/0-0`]: null }));
  });

  it('a guest can clear their own square', async () => {
    await assertSucceeds(write(guest(), { [`${G}/squares/0-1`]: null }));
  });

  it('a player cannot wipe the whole squares node', async () => {
    await assertFails(set(player(), `${G}/squares`, {}));
  });

  it('a player cannot replace the squares node with only their own squares', async () => {
    await assertFails(set(player(), `${G}/squares`, { '0-0': 'Alice' }));
  });

  it('a player cannot claim a square while the game is locked', async () => {
    await seed({ [`${G}/isLocked`]: true });
    await assertFails(write(player(), { [`${G}/squares/3-3`]: 'Alice' }));
  });

  it('a player cannot clear their own square while the game is locked', async () => {
    await seed({ [`${G}/isLocked`]: true });
    await assertFails(write(player(), { [`${G}/squares/0-0`]: null }));
  });

  it('a player can rename their own squares, color, paid entry and name mapping in one write, even while locked', async () => {
    await seed({ [`${G}/isLocked`]: true });
    await assertSucceeds(write(player(), {
      [`${G}/squares/0-0`]: 'Alicia',
      [`${G}/playerColors/Alice`]: null,
      [`${G}/playerColors/Alicia`]: 'bg-red-200',
      [`${G}/paidPlayers/0`]: 'Alicia',
      [`${G}/playerUserIds/Alice`]: null,
      [`${G}/playerUserIds/Alicia`]: 'alice'
    }));
  });

  it('the owner can overwrite any square', async () => {
    await assertSucceeds(write(owner(), { [`${G}/squares/0-2`]: 'Alice' }));
  });

  it('the owner can clear the whole squares node', async () => {
    await assertSucceeds(set(owner(), `${G}/squares`, null));
  });

  it('the owner can claim squares while the game is locked', async () => {
    await seed({ [`${G}/isLocked`]: true });
    await assertSucceeds(write(owner(), { [`${G}/squares/9-9`]: 'Walk-in' }));
  });

  it('the co-host can clear someone else\'s square', async () => {
    await assertSucceeds(write(cohost(), { [`${G}/squares/0-0`]: null }));
  });

  it('even the owner cannot write a square with an invalid key', async () => {
    await assertFails(write(owner(), { [`${G}/squares/10-1`]: 'Alice' }));
  });

  it('even the owner cannot write a square name longer than 50 characters', async () => {
    await assertFails(write(owner(), { [`${G}/squares/1-1`]: 'x'.repeat(51) }));
  });
});

describe('player maps', () => {
  it('a player can map a new name to their own uid', async () => {
    await assertSucceeds(write(player(), { [`${G}/playerUserIds/Ali`]: 'alice' }));
  });

  it('a player cannot map a new name to someone else\'s uid', async () => {
    await assertFails(write(player(), { [`${G}/playerUserIds/Ali`]: 'bob' }));
  });

  it('a guest cannot take over an existing name mapping', async () => {
    await assertFails(write(guest(), { [`${G}/playerUserIds/Alice`]: 'guest' }));
  });

  it('a guest cannot delete someone else\'s name mapping', async () => {
    await assertFails(write(guest(), { [`${G}/playerUserIds/Alice`]: null }));
  });

  it('a player cannot wipe the whole name mapping node', async () => {
    await assertFails(set(player(), `${G}/playerUserIds`, null));
  });

  it('a guest can assign a color to a player who has none', async () => {
    await assertSucceeds(write(guest(), { [`${G}/playerColors/Guesty`]: 'bg-green-200' }));
  });

  it('a player can change their own color', async () => {
    await assertSucceeds(write(player(), { [`${G}/playerColors/Alice`]: 'bg-green-200' }));
  });

  it('a guest cannot change someone else\'s color', async () => {
    await assertFails(write(guest(), { [`${G}/playerColors/Alice`]: 'bg-green-200' }));
  });

  it('a player cannot wipe the whole colors node', async () => {
    await assertFails(set(player(), `${G}/playerColors`, {}));
  });

  it('a guest cannot mark themselves as paid', async () => {
    await assertFails(write(guest(), { [`${G}/paidPlayers/2`]: 'Guesty' }));
  });

  it('a player cannot remove themselves from the paid list', async () => {
    await assertFails(write(player(), { [`${G}/paidPlayers/0`]: null }));
  });

  it('a player cannot rename someone else\'s paid entry', async () => {
    await assertFails(write(player(), { [`${G}/paidPlayers/1`]: 'Alice' }));
  });

  it('a player cannot replace the whole paid list', async () => {
    await assertFails(set(player(), `${G}/paidPlayers`, ['Alice', 'Bob', 'Guesty']));
  });

  it('the co-host can update the paid list', async () => {
    await assertSucceeds(set(cohost(), `${G}/paidPlayers`, ['Alice', 'Bob', 'Guesty']));
  });
});

describe('owner-only fields', () => {
  const fields: [string, unknown][] = [
    ['name', 'Renamed'],
    ['homeTeam', 'Other'],
    ['awayTeam', 'Other'],
    ['hostNote', 'Pay up'],
    ['emptyQuarterRule', 'redistribute'],
    ['pricePerSquare', 1],
    ['isLocked', true],
    ['isRandomized', true],
    ['homeNumbers', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
    ['awayNumbers', [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
    ['scores', { q1: { home: 7, away: 3 } }],
    ['winners', { q1: 'Alice' }],
    ['managerId', 'alice'],
    ['ownerId', 'alice']
  ];

  for (const [field, value] of fields) {
    it(`a player cannot change ${field}`, async () => {
      await assertFails(write(player(), { [`${G}/${field}`]: value }));
    });

    it(`a guest cannot change ${field}`, async () => {
      await assertFails(write(guest(), { [`${G}/${field}`]: value }));
    });
  }

  it('the owner can lock the game, set numbers, scores and the host note in one write', async () => {
    await assertSucceeds(write(owner(), {
      [`${G}/isLocked`]: true,
      [`${G}/homeNumbers`]: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [`${G}/scores/q1`]: { home: 7, away: 3 },
      [`${G}/hostNote`]: 'Venmo me'
    }));
  });

  it('the co-host can update scores and winners', async () => {
    await assertSucceeds(write(cohost(), {
      [`${G}/scores/q1`]: { home: 14, away: 10 },
      [`${G}/winners/q1`]: 'Alice'
    }));
  });

  it('the owner can clear the game back to defaults', async () => {
    await assertSucceeds(write(owner(), {
      [`${G}/squares`]: null,
      [`${G}/playerColors`]: null,
      [`${G}/paidPlayers`]: null,
      [`${G}/winners`]: {},
      [`${G}/isLocked`]: false,
      [`${G}/hostNote`]: ''
    }));
  });

  it('the owner can save a 140-character host note', async () => {
    await assertSucceeds(set(owner(), `${G}/hostNote`, 'x'.repeat(140)));
  });

  it('the owner cannot save a 141-character host note', async () => {
    await assertFails(set(owner(), `${G}/hostNote`, 'x'.repeat(141)));
  });

  it('the owner can delete the game', async () => {
    await assertSucceeds(set(owner(), G, null));
  });

  it('a player cannot delete the game', async () => {
    await assertFails(set(player(), G, null));
  });
});

describe('liveGames index', () => {
  const entry = `liveGames/401/${GAME}`;

  it('the owner can index their board under an ESPN game', async () => {
    await assertSucceeds(set(owner(), entry, { sport: 'nfl' }));
  });

  it('the co-host can index the board under an ESPN game', async () => {
    await assertSucceeds(set(cohost(), entry, { sport: 'nba' }));
  });

  it('a player cannot index someone else\'s board', async () => {
    await assertFails(set(player(), entry, { sport: 'nfl' }));
  });

  it('a signed-out visitor cannot index a board', async () => {
    await assertFails(set(visitor(), entry, { sport: 'nfl' }));
  });

  it('the owner cannot index with an unknown sport', async () => {
    await assertFails(set(owner(), entry, { sport: 'curling' }));
  });

  it('the owner cannot add extra fields to an index entry', async () => {
    await assertFails(set(owner(), entry, { sport: 'nfl', extra: 1 }));
  });

  it('nobody can read the liveGames index from a client', async () => {
    await seed({ [entry]: { sport: 'nfl' } });
    await assertFails(read(owner(), 'liveGames'));
    await assertFails(read(owner(), entry));
  });
});

describe('notifyMe', () => {
  const entry = (uid: string) => ({ email: 'a@b.co', timestamp: Date.now(), uid, source: 'welcome' });

  it('a signed-in user can leave their email', async () => {
    await assertSucceeds(set(player(), 'notifyMe/push1', entry('alice')));
  });

  it('a guest can leave their email', async () => {
    await assertSucceeds(set(guest(), 'notifyMe/push1', entry('guest')));
  });

  it('a user cannot leave an email under someone else\'s uid', async () => {
    await assertFails(set(player(), 'notifyMe/push1', entry('bob')));
  });

  it('a user cannot overwrite an existing entry', async () => {
    await seed({ 'notifyMe/push1': entry('alice') });
    await assertFails(set(player(), 'notifyMe/push1', entry('alice')));
  });

  it('a user cannot leave a malformed email', async () => {
    await assertFails(set(player(), 'notifyMe/push1', { ...entry('alice'), email: 'nope' }));
  });

  it('a user cannot add extra fields to an entry', async () => {
    await assertFails(set(player(), 'notifyMe/push1', { ...entry('alice'), extra: 'x' }));
  });

  it('accepts the optional prefilled and trigger fields', async () => {
    await assertSucceeds(set(player(), 'notifyMe/push1', { ...entry('alice'), prefilled: true, trigger: 'limit' }));
    await assertSucceeds(set(player(), 'notifyMe/push2', { ...entry('alice'), prefilled: false, trigger: 'pass' }));
  });

  it('rejects a bad prefilled or trigger value', async () => {
    await assertFails(set(player(), 'notifyMe/push1', { ...entry('alice'), prefilled: 'yes' }));
    await assertFails(set(player(), 'notifyMe/push1', { ...entry('alice'), trigger: 'banner' }));
  });

  it('a signed-out visitor cannot leave an email', async () => {
    await assertFails(set(visitor(), 'notifyMe/push1', entry('alice')));
  });

  it('nobody can read notifyMe entries', async () => {
    await seed({ 'notifyMe/push1': entry('alice') });
    await assertFails(read(player(), 'notifyMe/push1'));
    await assertFails(read(owner(), 'notifyMe'));
  });
});

describe('upgradeViews', () => {
  const rec = () => ({ firstAt: Date.now(), lastAt: Date.now(), count: 1 });

  it('a user can write and read their own view count', async () => {
    await assertSucceeds(set(player(), 'upgradeViews/alice', rec()));
    await assertSucceeds(read(player(), 'upgradeViews/alice'));
  });

  it('a user cannot write or read someone else\'s view count', async () => {
    await assertFails(set(player(), 'upgradeViews/bob', rec()));
    await seed({ 'upgradeViews/bob': rec() });
    await assertFails(read(player(), 'upgradeViews/bob'));
  });

  it('rejects extra keys and a missing count', async () => {
    await assertFails(set(player(), 'upgradeViews/alice', { ...rec(), extra: 1 }));
    await assertFails(set(player(), 'upgradeViews/alice', { firstAt: 1, lastAt: 1 }));
  });

  it('accepts limitCount and rejects a bad one', async () => {
    await assertSucceeds(set(player(), 'upgradeViews/alice', { ...rec(), limitCount: 1 }));
    await assertFails(set(player(), 'upgradeViews/alice', { ...rec(), limitCount: -1 }));
    await assertFails(set(player(), 'upgradeViews/alice', { ...rec(), limitCount: 'x' }));
  });

  it('a signed-out visitor cannot write', async () => {
    await assertFails(set(visitor(), 'upgradeViews/alice', rec()));
  });
});

describe('users', () => {
  it('a user can read and write their own profile data', async () => {
    await assertSucceeds(set(player(), 'users/alice/joinedGames/game01', { joinedAt: Date.now(), gameName: 'Office Pool' }));
    await assertSucceeds(read(player(), 'users/alice'));
  });

  it('a user cannot read someone else\'s profile data', async () => {
    await assertFails(read(player(), 'users/bob'));
  });

  it('a guest cannot write to someone else\'s profile data', async () => {
    await assertFails(set(guest(), 'users/alice/activeBoardId', 'game01'));
  });

  it('a signed-out visitor cannot read any profile data', async () => {
    await assertFails(read(visitor(), 'users/alice'));
  });

  it('a user can set a well-formed active board id', async () => {
    await assertSucceeds(set(player(), 'users/alice/activeBoardId', 'game01'));
  });

  it('a user cannot set a malformed active board id', async () => {
    await assertFails(set(player(), 'users/alice/activeBoardId', '../x'));
  });

  it('a user can clear their own active board slot', async () => {
    await seed({ 'users/alice/activeBoardId': 'game01' });
    await assertSucceeds(set(player(), 'users/alice/activeBoardId', null));
  });
});

describe('entitlements', () => {
  const admin = () => env.authenticatedContext('boss');
  const pass = (extra: Record<string, unknown> = {}) => ({ plan: 'season', expiresAt: Date.now() + HOUR, updatedAt: Date.now(), ...extra });

  beforeEach(async () => {
    await seed({ 'admins/boss': true, 'entitlements/alice': pass() });
  });

  it('a user can read their own pass', async () => {
    await assertSucceeds(read(player(), 'entitlements/alice'));
  });

  it('a user cannot read someone else\'s pass', async () => {
    await assertFails(read(owner(), 'entitlements/alice'));
    await assertFails(read(visitor(), 'entitlements/alice'));
  });

  it('an admin can read anyone\'s pass', async () => {
    await assertSucceeds(read(admin(), 'entitlements/alice'));
  });

  it('a user cannot grant themselves a pass', async () => {
    await assertFails(set(owner(), 'entitlements/owner', pass()));
  });

  it('a user cannot extend their own pass', async () => {
    await assertFails(set(player(), 'entitlements/alice/expiresAt', Date.now() + 1000 * HOUR));
  });

  it('a user cannot delete someone else\'s pass', async () => {
    await assertFails(set(owner(), 'entitlements/alice', null));
  });

  it('an admin can write a valid pass', async () => {
    await assertSucceeds(set(admin(), 'entitlements/owner', pass({ plan: 'week' })));
    await assertSucceeds(set(admin(), 'entitlements/bob', { plan: 'season', expiresAt: Date.now() + HOUR }));
  });

  it('an admin cannot write a pass with an unknown plan', async () => {
    await assertFails(set(admin(), 'entitlements/owner', pass({ plan: 'lifetime' })));
  });

  it('an admin cannot write a pass without an expiry', async () => {
    await assertFails(set(admin(), 'entitlements/owner', { plan: 'week' }));
  });

  it('an admin cannot write a pass with a non-positive or non-numeric expiry', async () => {
    await assertFails(set(admin(), 'entitlements/owner', pass({ expiresAt: 0 })));
    await assertFails(set(admin(), 'entitlements/owner', pass({ expiresAt: 'soon' })));
  });

  it('an admin cannot write a pass with a non-numeric updatedAt or extra fields', async () => {
    await assertFails(set(admin(), 'entitlements/owner', pass({ updatedAt: 'now' })));
    await assertFails(set(admin(), 'entitlements/owner', pass({ boards: 99 })));
  });
});

describe('adFreeUntil', () => {
  const field = `${G}/adFreeUntil`;

  it('an owner can always set it to zero', async () => {
    await assertSucceeds(set(owner(), field, 0));
  });

  it('an owner with an active pass can set it up to their pass expiry', async () => {
    const expiresAt = Date.now() + HOUR;
    await seed({ 'entitlements/owner': { plan: 'week', expiresAt } });
    await assertSucceeds(set(owner(), field, expiresAt));
  });

  it('an owner cannot set it beyond their pass expiry', async () => {
    const expiresAt = Date.now() + HOUR;
    await seed({ 'entitlements/owner': { plan: 'week', expiresAt } });
    await assertFails(set(owner(), field, expiresAt + 1));
  });

  it('an owner without a pass cannot set a non-zero value', async () => {
    await assertFails(set(owner(), field, Date.now() + HOUR));
  });

  it('an owner cannot set a negative or non-numeric value', async () => {
    await assertFails(set(owner(), field, -1));
    await assertFails(set(owner(), field, 'forever'));
  });

  it('an admin owner can set any value', async () => {
    await seed({ 'admins/owner': true });
    await assertSucceeds(set(owner(), field, Date.now() + 1000 * HOUR));
  });

  it('a player cannot set it', async () => {
    await seed({ 'entitlements/alice': { plan: 'week', expiresAt: Date.now() + HOUR } });
    await assertFails(set(player(), field, 0));
  });

  it('a signed-out visitor can read it', async () => {
    await seed({ [field]: 0 });
    await assertSucceeds(read(visitor(), field));
  });
});

describe('quarterSplit', () => {
  const field = `${G}/quarterSplit`;
  const split = { q1: 200, q2: 200, q3: 200, q4: 400 };
  const entitle = (uid: string) => seed({ [`entitlements/${uid}`]: { plan: 'season', expiresAt: Date.now() + HOUR } });

  it('an owner with an active pass can set a valid split', async () => {
    await entitle('owner');
    await assertSucceeds(set(owner(), field, split));
  });

  it('an owner cannot set a split that does not sum to 1000', async () => {
    await entitle('owner');
    await assertFails(set(owner(), field, { ...split, q4: 399 }));
    await assertFails(set(owner(), field, { ...split, q4: 401 }));
  });

  it('an owner cannot set a split with a missing quarter', async () => {
    await entitle('owner');
    await assertFails(set(owner(), field, { q1: 500, q2: 500, q3: 0 }));
  });

  it('an owner cannot set a non-integer, out-of-range, or extra quarter', async () => {
    await entitle('owner');
    await assertFails(set(owner(), field, { q1: 200.5, q2: 199.5, q3: 200, q4: 400 }));
    await assertFails(set(owner(), field, { q1: 1100, q2: -100, q3: 0, q4: 0 }));
    await assertFails(set(owner(), field, { ...split, q5: 0 }));
  });

  it('an owner without a pass cannot set a split', async () => {
    await assertFails(set(owner(), field, split));
  });

  it('an owner with an expired pass cannot set a split', async () => {
    await seed({ 'entitlements/owner': { plan: 'week', expiresAt: Date.now() - HOUR } });
    await assertFails(set(owner(), field, split));
  });

  it('an admin owner can set a split', async () => {
    await seed({ 'admins/owner': true });
    await assertSucceeds(set(owner(), field, split));
  });

  it('a co-host can set a split only with their own pass', async () => {
    await entitle('owner');
    await assertFails(set(cohost(), field, split));
    await entitle('cohost');
    await assertSucceeds(set(cohost(), field, split));
  });

  it('a player with a pass cannot set a split', async () => {
    await entitle('alice');
    await assertFails(set(player(), field, split));
  });

  it('an owner without a pass can delete a split', async () => {
    await seed({ [field]: split });
    await assertSucceeds(set(owner(), field, null));
  });
});

describe('gifted Season Pass', () => {
  const KEY = 'gifted@example,com';
  const gifted = (uid = 'owner', verified = true) =>
    env.authenticatedContext(uid, { email: 'Gifted@Example.com', email_verified: verified });
  const gift = (expiresAt = Date.now() + HOUR) => seed({ [`giftedSeasonPass/${KEY}`]: { expiresAt } });
  const split = { q1: 250, q2: 250, q3: 250, q4: 250 };

  it('only an admin can grant, list or revoke gifts', async () => {
    await seed({ 'admins/boss': true });
    const boss = env.authenticatedContext('boss');
    await assertSucceeds(set(boss, `giftedSeasonPass/${KEY}`, { expiresAt: Date.now() + HOUR }));
    await assertSucceeds(read(boss, 'giftedSeasonPass'));
    await assertFails(set(owner(), `giftedSeasonPass/${KEY}`, { expiresAt: Date.now() + HOUR }));
    await assertFails(read(owner(), 'giftedSeasonPass'));
    await assertSucceeds(set(boss, `giftedSeasonPass/${KEY}`, null));
  });

  it('a gifted host can create a second board while their linked board is active', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'owner', espnEventId: '401' }),
      'users/owner/activeBoardId': 'live01'
    });
    await gift();
    await assertSucceeds(set(gifted(), 'games/new001', baseGame({ ownerId: 'owner' })));
  });

  it('an expired or unverified gift does not lift the board limit', async () => {
    await seed({
      'games/live01': baseGame({ ownerId: 'owner', espnEventId: '401' }),
      'users/owner/activeBoardId': 'live01'
    });
    await gift(Date.now() - HOUR);
    await assertFails(set(gifted(), 'games/new001', baseGame({ ownerId: 'owner' })));
    await gift();
    await assertFails(set(gifted('owner', false), 'games/new001', baseGame({ ownerId: 'owner' })));
  });

  it('a gifted owner can set a quarter split; a gift for another email does not count', async () => {
    await gift();
    await assertSucceeds(set(gifted(), `${G}/quarterSplit`, split));
    const other = env.authenticatedContext('owner', { email: 'someone@example.com', email_verified: true });
    await assertFails(set(other, `${G}/quarterSplit`, split));
  });

  it('a gifted owner can stamp adFreeUntil up to the gift expiry', async () => {
    const expiresAt = Date.now() + HOUR;
    await gift(expiresAt);
    await assertSucceeds(set(gifted(), `${G}/adFreeUntil`, expiresAt));
    await assertFails(set(gifted(), `${G}/adFreeUntil`, expiresAt + 1));
  });

  it('a signed-in user without an email still gets the normal rules', async () => {
    await assertFails(set(owner(), `${G}/quarterSplit`, split));
    await assertSucceeds(set(owner(), `${G}/adFreeUntil`, 0));
  });
});

describe('emptyQuarterRule', () => {
  const field = `${G}/emptyQuarterRule`;

  it('the owner can set either rule, and it needs no pass', async () => {
    await assertSucceeds(set(owner(), field, 'final'));
    await assertSucceeds(set(owner(), field, 'redistribute'));
  });

  it('the co-host can change it', async () => {
    await assertSucceeds(set(cohost(), field, 'redistribute'));
  });

  it('rejects any other value', async () => {
    await assertFails(set(owner(), field, 'refund'));
    await assertFails(set(owner(), field, ''));
    await assertFails(set(owner(), field, 1));
    await assertFails(set(owner(), field, true));
    await assertFails(set(owner(), field, { rule: 'final' }));
  });

  it('can be cleared back to the default', async () => {
    await set(owner(), field, 'redistribute');
    await assertSucceeds(set(owner(), field, null));
  });

  it('can be saved together with the other Edit game fields', async () => {
    await assertSucceeds(write(owner(), {
      [`${G}/hostNote`]: 'Snacks at halftime',
      [`${G}/pricePerSquare`]: 5,
      [`${G}/emptyQuarterRule`]: 'redistribute'
    }));
  });

  it('a player, a guest and a signed-out visitor cannot change it', async () => {
    await seed({ [field]: 'final' });
    await assertFails(set(player(), field, 'redistribute'));
    await assertFails(set(guest(), field, 'redistribute'));
    await assertFails(set(visitor(), field, 'redistribute'));
  });

  it('a new game can be created with a rule', async () => {
    await assertSucceeds(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host', emptyQuarterRule: 'final' })));
  });

  it('a new game cannot be created with a bad rule', async () => {
    await assertFails(set(env.authenticatedContext('host'), 'games/new001', baseGame({ ownerId: 'host', emptyQuarterRule: 'refund' })));
  });
});

describe('removing a player', () => {
  const removeBob = {
    [`${G}/squares/0-2`]: null,
    [`${G}/playerColors/Bob`]: null,
    [`${G}/paidPlayers/1`]: null,
    [`${G}/playerUserIds/Bob`]: null,
    [`${G}/winners/q1`]: null
  };

  it('the owner can remove a player in one write', async () => {
    await assertSucceeds(write(owner(), removeBob));
    const squares = (await read(owner(), `${G}/squares`)).val();
    expect(squares).toEqual({ '0-0': 'Alice', '0-1': 'Guesty' });
  });

  it('the co-host can remove a player in one write', async () => {
    await assertSucceeds(write(cohost(), removeBob));
  });

  it('a player cannot remove someone else', async () => {
    await assertFails(write(player(), removeBob));
    await assertFails(write(player(), { [`${G}/squares/0-2`]: null }));
  });

  it('a signed-out visitor cannot remove a player', async () => {
    await assertFails(write(visitor(), removeBob));
  });
});

describe('users/usage counters', () => {
  it('a user can bump their own counters but not someone else\'s', async () => {
    await assertSucceeds(set(player(), 'users/alice/usage', { gamesCreated: 1, resets: 0, deletes: 0, lastGameAt: Date.now() }));
    await assertFails(set(player(), 'users/bob/usage/resets', 1));
  });

  it('rejects unknown keys and negative counts', async () => {
    await assertFails(set(player(), 'users/alice/usage/extra', 1));
    await assertFails(set(player(), 'users/alice/usage/resets', -1));
  });
});
