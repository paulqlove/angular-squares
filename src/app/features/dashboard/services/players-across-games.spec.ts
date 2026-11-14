import { PlayersBoard, playerTiles, playersAcrossGames } from './players-across-games';

const HOST = 'host-uid';

function board(id: string, squares: string[], extra: Partial<PlayersBoard> = {}): PlayersBoard {
  const selectedSquares: { [key: string]: string } = {};
  squares.forEach((name, i) => selectedSquares[`0-${i}`] = name);
  return { id, name: `Game ${id}`, isLocked: false, pricePerSquare: 5, ownerId: HOST, selectedSquares, ...extra };
}

describe('players across games', () => {
  it('groups one account across boards and adds up squares and points', () => {
    const accounts = { Dana: 'dana-uid' };
    const players = playersAcrossGames([
      board('A', ['Dana', 'Dana'], { playerUserIds: accounts }),
      board('B', ['Dana', 'Dana', 'Dana'], { playerUserIds: accounts, pricePerSquare: 10 })
    ]);
    expect(players.length).toBe(1);
    expect(players[0].key).toBe('dana-uid');
    expect(players[0].games.map(game => game.gameId)).toEqual(['A', 'B']);
    expect(players[0].squares).toBe(5);
    expect(players[0].points).toBe(40);
  });

  it('keeps names the host typed in apart on each board', () => {
    const players = playersAcrossGames([
      board('A', ['Pat'], { playerUserIds: { Pat: HOST } }),
      board('B', ['Pat'])
    ]);
    expect(players.map(player => player.key)).toEqual(['A/Pat', 'B/Pat']);
    expect(players.map(player => player.sameNameIndex)).toEqual([1, 2]);
  });

  it("treats a co-host's typed names as the co-host's, not a player's account", () => {
    const players = playersAcrossGames([board('A', ['Lee'], { managerId: 'co-uid', playerUserIds: { Lee: 'co-uid' } })]);
    expect(players[0].key).toBe('A/Lee');
  });

  it('marks a player Unconfirmed when any board has an unconfirmed square', () => {
    const accounts = { Sam: 'sam-uid' };
    const players = playersAcrossGames([
      board('A', ['Sam'], { playerUserIds: accounts, paidPlayers: ['Sam'], paidSquares: [1] }),
      board('B', ['Sam'], { playerUserIds: accounts })
    ]);
    expect(players[0].games.map(game => game.confirmed)).toEqual([true, false]);
    expect(players[0].confirmed).toBe(false);
  });

  it('counts squares added after the host confirmed as new squares', () => {
    const players = playersAcrossGames([board('A', ['Jo', 'Jo', 'Jo'], { playerUserIds: { Jo: 'jo-uid' }, paidPlayers: ['Jo'], paidSquares: [1] })]);
    expect(players[0].confirmed).toBe(false);
    expect(players[0].newSquares).toBe(2);
  });

  it('shows no new squares for a player the host never confirmed', () => {
    const players = playersAcrossGames([board('A', ['Jo', 'Jo'], { playerUserIds: { Jo: 'jo-uid' } })]);
    expect(players[0].newSquares).toBe(0);
  });

  it('names a player by the name they use most and keeps the others', () => {
    const players = playersAcrossGames([
      board('A', ['Sam'], { playerUserIds: { Sam: 'sam-uid' } }),
      board('B', ['Sam'], { playerUserIds: { Sam: 'sam-uid' } }),
      board('C', ['Sammy'], { playerUserIds: { Sammy: 'sam-uid' } })
    ]);
    expect(players[0].name).toBe('Sam');
    expect(players[0].otherNames).toEqual(['Sammy']);
  });

  it('flags the same name on two accounts, any case', () => {
    const players = playersAcrossGames([
      board('A', ['Chris'], { playerUserIds: { Chris: 'chris-1' } }),
      board('B', ['chris'], { playerUserIds: { chris: 'chris-2' } })
    ]);
    expect(players.map(player => player.sameNameIndex)).toEqual([1, 2]);
  });

  it('lists Unconfirmed players first, then by name', () => {
    const players = playersAcrossGames([board('A', ['Amy', 'Zed'], {
      playerUserIds: { Amy: 'amy-uid', Zed: 'zed-uid' },
      paidPlayers: ['Amy'],
      paidSquares: [1]
    })]);
    expect(players.map(player => player.name)).toEqual(['Zed', 'Amy']);
  });

  it('marks squares on a locked board as locked', () => {
    const players = playersAcrossGames([board('A', ['Kim'], { isLocked: true, playerUserIds: { Kim: 'kim-uid' } })]);
    expect(players[0].games[0].locked).toBe(true);
  });

  it('has no players for empty boards', () => {
    expect(playersAcrossGames([board('A', [])])).toEqual([]);
  });

  it('lays out one tile per board, empty where the player is not on it', () => {
    const [player] = playersAcrossGames([board('A', ['Kim'], { playerUserIds: { Kim: 'kim-uid' } })]);
    expect(playerTiles(player, ['B', 'A']).map(tile => tile?.gameId ?? null)).toEqual([null, 'A']);
  });
});
