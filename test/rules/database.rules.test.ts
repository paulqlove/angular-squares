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

  describe('a name the host put on the board with no account linked', () => {
    beforeEach(async () => {
      await seed({
        [`${G}/squares/0-3`]: 'Carl',
        [`${G}/playerColors/Carl`]: 'bg-amber-200',
        [`${G}/paidPlayers/2`]: 'Carl'
      });
    });

    it('a guest cannot link it to themselves', async () => {
      await assertFails(write(guest(), { [`${G}/playerUserIds/Carl`]: 'guest' }));
    });

    it('a guest cannot link it and then move its squares and paid mark to their own name', async () => {
      await assertFails(write(guest(), { [`${G}/playerUserIds/Carl`]: 'guest' }));
      await assertFails(write(guest(), { [`${G}/squares/0-3`]: 'Guesty', [`${G}/paidPlayers/2`]: 'Guesty' }));
    });

    it('a guest cannot take it while the game is locked either', async () => {
      await seed({ [`${G}/isLocked`]: true });
      await assertFails(write(guest(), { [`${G}/playerUserIds/Carl`]: 'guest' }));
      await assertFails(write(guest(), { [`${G}/squares/0-3`]: 'Guesty', [`${G}/paidPlayers/2`]: 'Guesty' }));
    });

    it('the host can still link it to a player', async () => {
      await assertSucceeds(write(owner(), { [`${G}/playerUserIds/Carl`]: 'guest' }));
    });

    it('once the host removes the player, anyone can use the name fresh', async () => {
      await seed({ [`${G}/squares/0-3`]: null, [`${G}/playerColors/Carl`]: null, [`${G}/paidPlayers/2`]: null });
      await assertSucceeds(write(guest(), { [`${G}/squares/5-5`]: 'Carl', [`${G}/playerUserIds/Carl`]: 'guest' }));
    });
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

  it('the host can record confirmed square counts', async () => {
    await assertSucceeds(write(owner(), { [`${G}/paidSquares/0`]: 1 }));
    await assertSucceeds(write(cohost(), { [`${G}/paidSquares/1`]: 1 }));
  });

  it('a confirmed square count must be a whole number of squares', async () => {
    await assertFails(write(owner(), { [`${G}/paidSquares/0`]: 1.5 }));
    await assertFails(write(owner(), { [`${G}/paidSquares/0`]: 'all' }));
  });

  it('a player cannot raise their own confirmed square count', async () => {
    await assertFails(write(player(), { [`${G}/paidSquares/0`]: 50 }));
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

  it('the owner can index a UFL game', async () => {
    await assertSucceeds(set(owner(), entry, { sport: 'ufl' }));
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

describe('users/firstTouch', () => {
  it('a user can save their own first touch', async () => {
    await assertSucceeds(set(player(), 'users/alice/firstTouch', { at: Date.now(), path: '/team/chiefs', ref: 'google.com' }));
  });

  it('cannot write someone else\'s, add unknown keys, or store long text', async () => {
    await assertFails(set(player(), 'users/bob/firstTouch', { at: 1, path: '/' }));
    await assertFails(set(player(), 'users/alice/firstTouch', { at: 1, path: '/', email: 'x@y.com' }));
    await assertFails(set(player(), 'users/alice/firstTouch', { at: 1, path: '/', ref: 'a'.repeat(101) }));
  });
});

describe('tvLinks (office TV link)', () => {
  const TOKEN = 'k7x9q2mZ4bR8tY1nWc5dLg';
  const link = (over: Record<string, unknown> = {}) => ({ boards: 'AAAAAA,BBBBBB', interval: 30, updatedAt: Date.now(), ...over });
  const claim = { 'users/alice/tvToken': TOKEN, [`tvTokenOwners/${TOKEN}`]: 'alice' };

  it('the owner can claim a token then publish a link under it', async () => {
    await assertSucceeds(write(player(), claim));
    await assertSucceeds(set(player(), `tvLinks/${TOKEN}`, link()));
  });

  it('nobody can write a link under a token nobody has claimed, or one they do not own', async () => {
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link()));
    await seed(claim);
    await assertFails(set(env.authenticatedContext('bob'), `tvLinks/${TOKEN}`, link()));
    await assertFails(set(visitor(), `tvLinks/${TOKEN}`, link()));
  });

  it('a second account cannot take over a claimed token, even by copying it into its own record', async () => {
    await seed({ ...claim, [`tvLinks/${TOKEN}`]: link() });
    const bob = env.authenticatedContext('bob');
    await assertFails(set(bob, `tvTokenOwners/${TOKEN}`, 'bob'));
    await assertSucceeds(set(bob, 'users/bob/tvToken', TOKEN));
    await assertFails(set(bob, `tvLinks/${TOKEN}`, link({ boards: 'CCCCCC' })));
    await assertFails(set(bob, `tvLinks/${TOKEN}`, null));
    await assertFails(set(bob, `tvTokenOwners/${TOKEN}`, null));
  });

  it('an account cannot claim a token for someone else', async () => {
    await assertFails(set(player(), `tvTokenOwners/${TOKEN}`, 'bob'));
  });

  it('anyone with the token can read the link, but nobody can list links or read the owner index', async () => {
    await seed({ ...claim, [`tvLinks/${TOKEN}`]: link() });
    await assertSucceeds(read(visitor(), `tvLinks/${TOKEN}`));
    await assertFails(read(visitor(), 'tvLinks'));
    await assertFails(read(player(), 'tvLinks'));
    await assertFails(read(player(), `tvTokenOwners/${TOKEN}`));
  });

  it('the owner can turn the link off and release the token', async () => {
    await seed({ ...claim, [`tvLinks/${TOKEN}`]: link() });
    await assertSucceeds(set(player(), `tvLinks/${TOKEN}`, null));
    await assertSucceeds(write(player(), { 'users/alice/tvToken': null, [`tvTokenOwners/${TOKEN}`]: null }));
  });

  it('the owner cannot release a token while its link still exists', async () => {
    await seed({ ...claim, [`tvLinks/${TOKEN}`]: link() });
    await assertFails(set(player(), `tvTokenOwners/${TOKEN}`, null));
  });

  it('a guest cannot claim a token or publish a link', async () => {
    await assertFails(set(guest(), `tvTokenOwners/${TOKEN}`, 'guest'));
    await seed({ [`tvTokenOwners/${TOKEN}`]: 'guest' });
    await assertFails(set(guest(), `tvLinks/${TOKEN}`, link()));
  });

  it('rejects a bad interval, a bad board id, too many boards and extra keys', async () => {
    await seed(claim);
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ interval: 45 })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ boards: 'bad id' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ boards: '' })));
    const many = Array.from({ length: 21 }, (_, i) => `B${String(i).padStart(5, '0')}`).join(',');
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ boards: many })));
    await assertSucceeds(set(player(), `tvLinks/${TOKEN}`, link({ boards: many.split(',').slice(0, 20).join(',') })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ extra: 1 })));
  });

  it('a link can follow one of the owner\'s own groups, and only that', async () => {
    const WORK = 'WorkGroupKey00000001';
    await seed({ ...claim, [`groupLists/alice/groups/${WORK}`]: { name: 'Work', createdAt: 1 }, [`groupLists/bob/groups/BobsGroupKey00000001`]: { name: 'Bob', createdAt: 1 } });
    await assertSucceeds(set(player(), `tvLinks/${TOKEN}`, link({ group: WORK, owner: 'alice' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: WORK })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: WORK, owner: 'bob' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: 'BobsGroupKey00000001', owner: 'alice' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: 'MissingGroupKey00001', owner: 'alice' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: 'bad key!', owner: 'alice' })));
    await assertFails(set(player(), `tvLinks/${TOKEN}`, link({ group: 12, owner: 'alice' })));
  });

  it('a signed-out TV following a group reads its link and the group\'s board list, but not the group\'s name or co-hosts', async () => {
    const WORK = 'WorkGroupKey00000001';
    await seed({
      ...claim,
      [`tvLinks/${TOKEN}`]: link({ group: WORK, owner: 'alice' }),
      [`groupLists/alice/groups/${WORK}`]: { name: 'Work', createdAt: 1 },
      [`groupCoHosts/alice/${WORK}`]: { email: 'cohost@example.com' },
      [`openLists/${WORK}/AAAAAA`]: 'alice'
    });
    await assertSucceeds(read(visitor(), `tvLinks/${TOKEN}`));
    await assertSucceeds(read(visitor(), `openLists/${WORK}`));
    await assertFails(read(visitor(), `groupLists/alice/groups/${WORK}`));
    await assertFails(read(visitor(), 'groupCoHosts/alice'));
  });

  it('rejects a short or odd token', async () => {
    await assertFails(set(player(), 'users/alice/tvToken', 'short'));
    await assertFails(set(player(), 'users/alice/tvToken', 'has spaces and symbols!!!'));
    await assertFails(set(player(), 'tvTokenOwners/short', 'alice'));
  });
});

describe('a guest who signs in', () => {
  // Guesty's square 0-1 was picked by the anonymous uid "guest". Signing in is meant to keep that uid
  // (the Firebase account is linked, not replaced), so the same uid now has a real sign-in provider.
  const linkedGuest = () => env.authenticatedContext('guest', { firebase: { sign_in_provider: 'google.com' }, email: 'guesty@example.com' });
  const replacedGuest = () => env.authenticatedContext('brand-new-uid', { firebase: { sign_in_provider: 'google.com' }, email: 'guesty@example.com' });

  it('keeps the uid after linking, so they can still give their square back', async () => {
    await assertSucceeds(write(linkedGuest(), { [`${G}/squares/0-1`]: null }));
  });

  it('keeps the uid after linking, so they can still pick another square under the same name', async () => {
    await assertSucceeds(write(linkedGuest(), { [`${G}/squares/5-5`]: 'Guesty' }));
  });

  it('with a brand-new uid (the old behaviour) they could not release the square', async () => {
    await assertFails(write(replacedGuest(), { [`${G}/squares/0-1`]: null }));
  });

  it('with a brand-new uid they could not take over the old name either', async () => {
    await assertFails(write(replacedGuest(), { [`${G}/playerUserIds/Guesty`]: 'brand-new-uid' }));
    await assertFails(write(replacedGuest(), { [`${G}/squares/5-5`]: 'Guesty' }));
  });
});

describe('game groups (groupLists, groupCoHosts, coHosts, openLists)', () => {
  const UNGROUPED = 'ungroupedKey0000000001';
  const CHURCH = 'churchGroupKey00000001';
  const WORK = 'workGroupKey0000000001';
  const OTHER = 'strangerGroup000000001';
  const stranger = () => env.authenticatedContext('stranger');
  const pass = { plan: 'season', expiresAt: Date.now() + HOUR, updatedAt: Date.now() };
  const group = (name: string) => ({ name, createdAt: Date.now() });

  beforeEach(async () => {
    await seed({
      'entitlements/owner': pass,
      'groupLists/owner': { ungrouped: UNGROUPED, groups: { [CHURCH]: group('Church'), [WORK]: group('Work') } },
      'groupLists/stranger': { ungrouped: 'strangerUngrouped00001', groups: { [OTHER]: group('Mine') } },
      'coHosts/owner/cohost': true,
      [`${G}/openListId`]: CHURCH
    });
  });

  describe('groupLists', () => {
    it('the owner and their co-hosts can read the group names', async () => {
      await assertSucceeds(read(owner(), 'groupLists/owner'));
      await assertSucceeds(read(cohost(), 'groupLists/owner'));
    });

    it('players, guests, visitors and other hosts cannot read them', async () => {
      await assertFails(read(player(), 'groupLists/owner'));
      await assertFails(read(guest(), 'groupLists/owner'));
      await assertFails(read(visitor(), 'groupLists/owner'));
      await assertFails(read(stranger(), 'groupLists/owner'));
      await assertFails(read(owner(), 'groupLists'));
    });

    it('a Season Pass owner can create, rename and delete a group', async () => {
      const id = 'newGroupKey00000000001';
      await assertSucceeds(set(owner(), `groupLists/owner/groups/${id}`, group('Family')));
      await assertSucceeds(set(owner(), `groupLists/owner/groups/${id}/name`, 'Fam'));
      await assertSucceeds(set(owner(), `groupLists/owner/groups/${id}`, null));
    });

    it('groups freeze when the owner has no Season Pass', async () => {
      await seed({ 'entitlements/owner': null });
      await assertFails(set(owner(), 'groupLists/owner/groups/newGroupKey00000000001', group('Family')));
      await assertFails(set(owner(), `groupLists/owner/groups/${CHURCH}/name`, 'Chapel'));
      await assertFails(set(owner(), `groupLists/owner/groups/${CHURCH}`, null));
    });

    it('rejects empty or long names, extra fields and odd ids', async () => {
      await assertFails(set(owner(), 'groupLists/owner/groups/newGroupKey00000000001', group(' ')));
      await assertFails(set(owner(), 'groupLists/owner/groups/newGroupKey00000000001', group('x'.repeat(31))));
      await assertFails(set(owner(), 'groupLists/owner/groups/newGroupKey00000000001', { ...group('A'), color: 'red' }));
      await assertFails(set(owner(), 'groupLists/owner/groups/short', group('A')));
      await assertFails(set(owner(), 'groupLists/owner/other', 'x'));
    });

    it('a group no longer holds its co-host', async () => {
      await assertFails(set(owner(), `groupLists/owner/groups/${CHURCH}/coHost`, { email: 'dana@email.com' }));
    });

    it('co-hosts and strangers cannot change the owner\'s groups', async () => {
      await assertFails(set(cohost(), 'groupLists/owner/groups/newGroupKey00000000001', group('Mine')));
      await assertFails(set(cohost(), `groupLists/owner/groups/${CHURCH}/name`, 'Mine'));
      await assertFails(set(stranger(), `groupLists/owner/groups/${CHURCH}`, null));
    });

    it('the ungrouped key is written once by the owner and never changed', async () => {
      await seed({ 'groupLists/owner/ungrouped': null });
      await assertFails(set(stranger(), 'groupLists/owner/ungrouped', 'freshUngroupedKey00001'));
      await assertFails(set(owner(), 'groupLists/owner/ungrouped', 'bad key'));
      await assertSucceeds(set(owner(), 'groupLists/owner/ungrouped', 'freshUngroupedKey00001'));
      await assertFails(set(owner(), 'groupLists/owner/ungrouped', 'otherUngroupedKey00001'));
      await assertFails(set(owner(), 'groupLists/owner/ungrouped', null));
    });
  });

  describe('groupCoHosts', () => {
    const path = `groupCoHosts/owner/${CHURCH}`;

    it('only the owner can read a group\'s co-host: not their co-hosts, players or strangers', async () => {
      await seed({ [path]: { email: 'dana@email.com' } });
      await assertSucceeds(read(owner(), 'groupCoHosts/owner'));
      await assertSucceeds(read(owner(), path));
      await assertFails(read(cohost(), 'groupCoHosts/owner'));
      await assertFails(read(cohost(), path));
      await assertFails(read(stranger(), path));
      await assertFails(read(player(), path));
      await assertFails(read(visitor(), path));
      await assertFails(read(owner(), 'groupCoHosts'));
    });

    it('a Season Pass owner can set and remove a group\'s co-host, and give it to games in one write', async () => {
      await assertSucceeds(set(owner(), path, { email: 'dana@email.com' }));
      await assertSucceeds(write(owner(), {
        [path]: { email: 'lee@email.com' },
        [`${G}/managerId`]: '',
        [`${G}/managerEmail`]: null,
        [`${G}/managerName`]: '',
        [`gameCoHosts/owner/${GAME}`]: 'lee@email.com'
      }));
      await assertSucceeds(set(owner(), path, null));
    });

    it('a new group and its co-host go in one write; deleting the group clears it in one write', async () => {
      const id = 'newGroupKey00000000001';
      await assertSucceeds(write(owner(), { [`groupLists/owner/groups/${id}`]: group('Family'), [`groupCoHosts/owner/${id}`]: { email: 'dana@email.com' } }));
      await assertSucceeds(write(owner(), { [`groupLists/owner/groups/${id}`]: null, [`groupCoHosts/owner/${id}`]: null }));
    });

    it('needs the owner, a Season Pass, an existing group and an email', async () => {
      await assertFails(set(cohost(), path, { email: 'dana@email.com' }));
      await assertFails(set(stranger(), path, { email: 'dana@email.com' }));
      await assertFails(set(owner(), 'groupCoHosts/owner/missingGroupKey000001', { email: 'dana@email.com' }));
      await assertFails(set(owner(), path, { email: 'not an email' }));
      await assertFails(set(owner(), path, { email: `${'x'.repeat(250)}@a.co` }));
      await assertFails(set(owner(), path, { email: 'dana@email.com', uid: 'x' }));
      await assertFails(set(owner(), path, 'dana@email.com'));
      await seed({ 'entitlements/owner': null });
      await assertFails(set(owner(), path, { email: 'dana@email.com' }));
    });
  });

  describe('coHosts', () => {
    it('only the owner can add or remove a co-host entry', async () => {
      await assertSucceeds(set(owner(), 'coHosts/owner/bob', true));
      await assertSucceeds(set(owner(), 'coHosts/owner/bob', null));
      await assertFails(set(stranger(), 'coHosts/owner/stranger', true));
      await assertFails(set(cohost(), 'coHosts/owner/alice', true));
      await assertFails(set(owner(), 'coHosts/owner/bob', 'yes'));
    });

    it('only the owner can read the list', async () => {
      await assertSucceeds(read(owner(), 'coHosts/owner'));
      await assertFails(read(cohost(), 'coHosts/owner'));
    });
  });

  describe('games/openListId', () => {
    it('the owner can file a game into one of their groups or No group', async () => {
      await assertSucceeds(set(owner(), `${G}/openListId`, WORK));
      await assertSucceeds(set(owner(), `${G}/openListId`, UNGROUPED));
    });

    it('a co-host can file the game into one of the owner\'s groups', async () => {
      await assertSucceeds(set(cohost(), `${G}/openListId`, WORK));
    });

    it('a game cannot point at a list that is not its owner\'s', async () => {
      await assertFails(set(owner(), `${G}/openListId`, OTHER));
      await assertFails(set(cohost(), `${G}/openListId`, 'madeUpGroupKey00000001'));
      await assertFails(set(owner(), `${G}/openListId`, 'bad key'));
    });

    it('a player cannot move a game', async () => {
      await assertFails(set(player(), `${G}/openListId`, WORK));
    });

    it('deleting a group moves its games to No group in one update', async () => {
      await assertSucceeds(write(owner(), {
        [`groupLists/owner/groups/${CHURCH}`]: null,
        [`${G}/openListId`]: UNGROUPED,
        [`openLists/${CHURCH}/${GAME}`]: null,
        [`openLists/${UNGROUPED}/${GAME}`]: 'owner'
      }));
    });
  });

  describe('openLists', () => {
    it('the owner or co-host lists the game in its own list', async () => {
      await assertSucceeds(set(owner(), `openLists/${CHURCH}/${GAME}`, 'owner'));
      await assertSucceeds(set(cohost(), `openLists/${CHURCH}/${GAME}`, null));
      await assertSucceeds(set(cohost(), `openLists/${CHURCH}/${GAME}`, 'owner'));
    });

    it('a game cannot be listed in another group\'s list', async () => {
      await assertFails(set(owner(), `openLists/${WORK}/${GAME}`, 'owner'));
      await assertFails(set(owner(), `openLists/${OTHER}/${GAME}`, 'owner'));
    });

    it('the entry must name the game\'s owner', async () => {
      await assertFails(set(owner(), `openLists/${CHURCH}/${GAME}`, true));
      await assertFails(set(owner(), `openLists/${CHURCH}/${GAME}`, 'stranger'));
    });

    it('players and strangers cannot add or remove entries', async () => {
      await seed({ [`openLists/${CHURCH}/${GAME}`]: 'owner' });
      await assertFails(set(player(), `openLists/${CHURCH}/${GAME}`, null));
      await assertFails(set(stranger(), `openLists/${CHURCH}/${GAME}`, null));
      await assertFails(set(stranger(), `openLists/${OTHER}/${GAME}`, 'owner'));
    });

    it('anyone can read one list by its key, nobody can list them all', async () => {
      await seed({ [`openLists/${CHURCH}/${GAME}`]: 'owner' });
      await assertSucceeds(read(visitor(), `openLists/${CHURCH}`));
      await assertFails(read(visitor(), 'openLists'));
      await assertFails(read(owner(), 'openLists'));
    });

    it('moving a game to another group moves its entry in one update', async () => {
      await seed({ [`openLists/${CHURCH}/${GAME}`]: 'owner' });
      await assertSucceeds(write(cohost(), {
        [`${G}/openListId`]: WORK,
        [`openLists/${CHURCH}/${GAME}`]: null,
        [`openLists/${WORK}/${GAME}`]: 'owner'
      }));
    });
  });
});

describe('a co-host added by email', () => {
  const INVITED = 'game02';
  const I = `games/${INVITED}`;
  const dana = (verified = true, email = 'dana@example.com') => env.authenticatedContext('dana', { email, email_verified: verified });
  const claim = (ctx: RulesTestContext, uid = 'dana') => set(ctx, `${I}/managerId`, uid);

  beforeEach(async () => {
    const { managerId: _none, ...game } = baseGame();
    await seed({ [I]: game, [`gameCoHosts/owner/${INVITED}`]: 'Dana@Example.com', 'groupLists/owner': { ungrouped: 'ungroupedKey0000000001' }, 'games/other1': baseGame({ ownerId: 'stranger', managerId: 'dana' }) });
  });

  it('the person who signs in with that verified email becomes the co-host, ignoring case', async () => {
    await assertSucceeds(claim(dana()));
    await assertSucceeds(set(dana(), `${I}/name`, 'Dana runs this'));
  });

  it('can take an empty co-host slot the app cleared to ""', async () => {
    await seed({ [`${I}/managerId`]: '' });
    await assertSucceeds(claim(dana()));
  });

  it('an unverified email, a different email or a guest cannot claim it', async () => {
    await assertFails(claim(dana(false)));
    await assertFails(claim(dana(true, 'eve@example.com')));
    await assertFails(claim(guest(), 'guest'));
    await assertFails(claim(player(), 'alice'));
  });

  it('cannot claim it for another account, or take a slot someone already holds', async () => {
    await assertFails(claim(dana(), 'eve'));
    await seed({ [`${I}/managerId`]: 'cohost' });
    await assertFails(claim(dana()));
  });

  it('a game with no co-host email cannot be claimed, and the old public field no longer counts', async () => {
    await seed({ [`gameCoHosts/owner/${INVITED}`]: null });
    await assertFails(claim(dana()));
    await seed({ [`${I}/managerEmail`]: 'dana@example.com' });
    await assertFails(claim(dana()));
  });

  it('an email saved for another owner\'s game id does not count', async () => {
    await seed({ [`gameCoHosts/owner/${INVITED}`]: null, [`gameCoHosts/stranger/${INVITED}`]: 'dana@example.com' });
    await assertFails(claim(dana()));
  });

  it('the claimed co-host can mark themselves to read group names, only through a game they co-host for that owner', async () => {
    await assertFails(set(dana(), 'coHosts/owner/dana', INVITED));
    await assertFails(read(dana(), 'groupLists/owner'));
    await assertSucceeds(claim(dana()));
    await assertFails(set(dana(), 'coHosts/owner/dana', 'other1'));
    await assertFails(set(dana(), 'coHosts/owner/dana', true));
    await assertFails(set(dana(), 'coHosts/owner/eve', INVITED));
    await assertSucceeds(set(dana(), 'coHosts/owner/dana', INVITED));
    await assertSucceeds(read(dana(), 'groupLists/owner'));
  });

  it('the mark stops working once the owner removes them, and never replaces the owner\'s own mark', async () => {
    await seed({ [`${I}/managerId`]: 'dana', 'coHosts/owner/dana': INVITED });
    await assertSucceeds(read(dana(), 'groupLists/owner'));
    await seed({ [`${I}/managerId`]: '' });
    await assertFails(read(dana(), 'groupLists/owner'));
    await seed({ [`${I}/managerId`]: 'dana', 'coHosts/owner/dana': true });
    await assertFails(set(dana(), 'coHosts/owner/dana', INVITED));
  });
});

describe('gameCoHosts: a game\'s co-host email, hidden from everyone but the owner and that person', () => {
  const path = `gameCoHosts/owner/${GAME}`;
  const dana = (verified = true, email = 'dana@example.com') => env.authenticatedContext('dana', { email, email_verified: verified });
  const stranger = () => env.authenticatedContext('stranger');

  beforeEach(async () => {
    await seed({ [path]: 'Dana@Example.com', 'gameCoHosts/owner/game09': 'lee@example.com' });
  });

  it('the owner can read every game\'s co-host email, one or all', async () => {
    await assertSucceeds(read(owner(), 'gameCoHosts/owner'));
    await assertSucceeds(read(owner(), path));
  });

  it('a player, a guest, a co-host, a stranger and a signed-out visitor cannot read it', async () => {
    for (const ctx of [player(), guest(), cohost(), stranger(), visitor()]) {
      await assertFails(read(ctx, path));
      await assertFails(read(ctx, 'gameCoHosts/owner'));
    }
    await assertFails(read(owner(), 'gameCoHosts'));
  });

  it('the person it names can read only their own invite, with a verified email, ignoring case', async () => {
    await assertSucceeds(read(dana(), path));
    await assertFails(read(dana(), 'gameCoHosts/owner/game09'));
    await assertFails(read(dana(), 'gameCoHosts/owner'));
    await assertFails(read(dana(false), path));
    await assertFails(read(dana(true, 'eve@example.com'), path));
  });

  it('the game no longer shows the email to anyone reading it', async () => {
    const game = await read(visitor(), G);
    expect(game.val().managerEmail).toBeUndefined();
  });

  it('only the owner can set, change or clear it, and only on their own game', async () => {
    await assertSucceeds(set(owner(), path, 'kim@example.com'));
    await assertSucceeds(write(owner(), { [path]: null, [`${G}/managerId`]: 'cohost', [`${G}/managerName`]: 'Cory' }));
    for (const ctx of [cohost(), player(), stranger(), dana(), visitor()]) {
      await assertFails(set(ctx, path, 'eve@example.com'));
    }
    await seed({ 'games/theirs': baseGame({ ownerId: 'stranger' }) });
    await assertFails(set(owner(), 'gameCoHosts/owner/theirs', 'kim@example.com'));
    await assertFails(set(owner(), 'gameCoHosts/owner/nogame', 'kim@example.com'));
  });

  it('must be text of 1 to 254 characters', async () => {
    await assertFails(set(owner(), path, ''));
    await assertFails(set(owner(), path, `${'x'.repeat(250)}@a.co`));
    await assertFails(set(owner(), path, { email: 'kim@example.com' }));
  });

  it('a new game and its co-host email go in one write, and deleting the game clears it in one write', async () => {
    await seed({ 'entitlements/owner': null });
    const fresh = { ...baseGame({ managerId: '' }), squares: {}, playerUserIds: {}, playerColors: {}, paidPlayers: [] };
    await assertSucceeds(write(owner(), { 'games/game05': fresh, 'gameCoHosts/owner/game05': 'kim@example.com' }));
    await assertSucceeds(write(owner(), { 'games/game05': null, 'gameCoHosts/owner/game05': null }));
  });
});
