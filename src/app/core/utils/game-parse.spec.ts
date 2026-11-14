import type { GameData } from './game-data';
import {
  decodeEmailKey,
  encodeEmailKey,
  generateGameId,
  isBoardId,
  isLinkableEspnId,
  normalizeSport,
  parseGameData,
  readEspnLive,
  readGameIndexVisits,
  readTvLink,
  renamePlayerInGame,
  sortGameIdsNewestFirst,
  toGameListItem
} from './game-parse';

describe('game parse helpers', () => {
  it('turns an email into a Firebase key and back', () => {
    expect(encodeEmailKey('Pat.Lee@Example.com')).toBe('pat,lee@example,com');
    expect(decodeEmailKey('pat,lee@example,com')).toBe('pat.lee@example.com');
  });

  it('makes six-character board ids without ambiguous characters', () => {
    const id = generateGameId();
    expect(id).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(generateGameId(() => 0)).toBe('AAAAAA');
    expect(generateGameId(() => 0.999)).toBe('999999');
  });

  it('checks board and ESPN ids', () => {
    expect(isBoardId('ABC123')).toBe(true);
    expect(isBoardId('ABC12')).toBe(false);
    expect(isBoardId('ABC-12')).toBe(false);
    expect(isLinkableEspnId('401866461')).toBe(true);
    expect(isLinkableEspnId('a_b-c')).toBe(true);
    expect(isLinkableEspnId('')).toBe(false);
    expect(isLinkableEspnId('a/b')).toBe(false);
    expect(isLinkableEspnId('x'.repeat(51))).toBe(false);
  });

  it('reads unknown sports as NFL', () => {
    expect(normalizeSport('nba')).toBe('nba');
    expect(normalizeSport('afl')).toBe('afl');
    expect(normalizeSport('mlb')).toBe('nfl');
    expect(normalizeSport(undefined)).toBe('nfl');
  });

  describe('parseGameData', () => {
    it('fills defaults for an empty record', () => {
      const game = parseGameData('ABC123', {}, 1000);
      expect(game).toEqual(expect.objectContaining({
        id: 'ABC123',
        name: 'Football Squares',
        ownerId: '',
        ownerName: 'Unknown',
        createdAt: 1000,
        boardSize: 100,
        selectedSquares: {},
        pricePerSquare: 10,
        isRandomized: false,
        isLocked: false,
        hostNote: '',
        showInOpenBoards: false,
        paidPlayers: [],
        adFreeUntil: 0,
        quarterSplit: null
      }));
      expect(game.homeNumbers).toEqual(Array(10).fill(null));
      expect(game.awayNumbers).toEqual(Array(10).fill(null));
      expect(game.scores.q4).toEqual({ home: 0, away: 0 });
      expect(game.espnLive).toBeUndefined();
      expect(game.emptyQuarterRule).toBeUndefined();
    });

    it('sizes the number rows to the board and maps squares to selectedSquares', () => {
      const game = parseGameData('ABC123', { boardSize: 50, squares: { '0-1': 'Ann' }, createdAt: 5 });
      expect(game.boardSize).toBe(50);
      expect(game.homeNumbers.length).toBe(10);
      expect(game.awayNumbers.length).toBe(5);
      expect(game.selectedSquares).toEqual({ '0-1': 'Ann' });
      expect(game.createdAt).toBe(5);
    });

    it('treats an unknown board size as 100 and keeps only a known empty-quarter rule', () => {
      expect(parseGameData('A', { boardSize: 64 }).boardSize).toBe(100);
      expect(parseGameData('A', { emptyQuarterRule: 'redistribute' }).emptyQuarterRule).toBe('redistribute');
      expect(parseGameData('A', { emptyQuarterRule: 'other' }).emptyQuarterRule).toBeUndefined();
    });
  });

  describe('readEspnLive', () => {
    it('drops a snapshot without a known status', () => {
      expect(readEspnLive(null)).toBeUndefined();
      expect(readEspnLive('in')).toBeUndefined();
      expect(readEspnLive({ status: 'halftime' })).toBeUndefined();
    });

    it('defaults missing fields and reads quarters stored as an object', () => {
      const live = readEspnLive({ status: 'in', period: 2, quarters: { '1': { home: 3, away: 7 }, '0': { home: 7 } } });
      expect(live).toEqual({
        status: 'in', period: 2, clock: '', completed: false, homeScore: 0, awayScore: 0, homeTeam: '', awayTeam: '',
        quarters: [{ home: 7, away: 0 }, { home: 3, away: 7 }]
      });
    });

    it('reads quarters stored as an array', () => {
      expect(readEspnLive({ status: 'post', completed: true, quarters: [{ home: 1, away: 2 }, null] })?.quarters)
        .toEqual([{ home: 1, away: 2 }, { home: 0, away: 0 }]);
    });
  });

  it('reads a user game index', () => {
    expect(readGameIndexVisits(null, 'createdAt')).toEqual([]);
    expect(readGameIndexVisits({ A: { createdAt: 5 }, B: null, C: { joinedAt: 'x' } }, 'createdAt'))
      .toEqual([{ id: 'A', at: 5 }, { id: 'B', at: 0 }, { id: 'C', at: 0 }]);
  });

  it('sorts board ids newest first', () => {
    expect(sortGameIdsNewestFirst({ A: { createdAt: 1 }, B: { createdAt: 3 }, C: {} })).toEqual(['B', 'A', 'C']);
  });

  it('reads a TV link', () => {
    expect(readTvLink(null)).toBeNull();
    expect(readTvLink({ boards: '', interval: 10 })).toBeNull();
    expect(readTvLink({ boards: 'A,,B', interval: 20 })).toEqual({ boards: ['A', 'B'], interval: 20 });
    expect(readTvLink({ boards: 'A', interval: 15 })).toEqual({ boards: ['A'], interval: 30 });
  });

  describe('renamePlayerInGame', () => {
    const game = (): GameData => parseGameData('ABC123', {
      squares: { '0-0': 'Mike', '0-1': 'mike', '1-1': 'Ann' },
      playerColors: { Mike: 'bg-red-200', Ann: 'bg-blue-200' },
      paidPlayers: ['MIKE', 'Ann'],
      playerUserIds: { Mike: 'uid1' }
    });

    it('returns null when the old name holds no square', () => {
      expect(renamePlayerInGame(game(), 'Zed', 'Zoe')).toBeNull();
    });

    it('renames squares and paid players ignoring case, and moves color and user id by exact name', () => {
      expect(renamePlayerInGame(game(), 'Mike', 'Michael')).toEqual({
        selectedSquares: { '0-0': 'Michael', '0-1': 'Michael', '1-1': 'Ann' },
        playerColors: { Ann: 'bg-blue-200', Michael: 'bg-red-200' },
        paidPlayers: ['Michael', 'Ann'],
        playerUserIds: { Michael: 'uid1' }
      });
    });
  });

  describe('toGameListItem', () => {
    const game = parseGameData('ABC123', {
      name: 'Office', createdAt: 9, squares: { '0-0': 'Ann', '0-1': 'Ann', '1-1': 'Bo' },
      paidPlayers: ['Ann', 'Gone'], showInOpenBoards: true, maxSquaresPerPlayer: 4, emptyQuarterRule: 'final'
    });

    it('counts players, squares and confirmed players', () => {
      const item = toGameListItem('ABC123', game, true);
      expect(item.playerCount).toBe(2);
      expect(item.squaresFilled).toBe(3);
      expect(item.confirmedCount).toBe(1);
      expect(item.boardSize).toBe(100);
    });

    it('does not count a confirmed player who added squares after the confirm', () => {
      const later = parseGameData('ABC123', { squares: { '0-0': 'Ann', '0-1': 'Ann' }, paidPlayers: ['Ann'], paidSquares: [1] });
      expect(toGameListItem('ABC123', later, true).confirmedCount).toBe(0);
    });

    it('adds host settings only for owned boards', () => {
      const owned = toGameListItem('ABC123', game, true);
      expect(owned.showInOpenBoards).toBe(true);
      expect(owned.maxSquaresPerPlayer).toBe(4);
      expect(owned.emptyQuarterRule).toBe('final');
      const joined = toGameListItem('ABC123', game, false);
      expect('showInOpenBoards' in joined).toBe(false);
      expect('autoManage' in joined).toBe(false);
      expect('maxSquaresPerPlayer' in joined).toBe(false);
      expect('emptyQuarterRule' in joined).toBe(false);
    });
  });
});
