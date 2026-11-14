import { PlayersBoard, phoneGames, phoneLayout, playerTiles, playersAcrossGames } from './players-across-games';

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

  it("groups a name the host typed in, or claimed as themselves, across the host's boards", () => {
    const players = playersAcrossGames([
      board('A', ['Paul Love'], { playerUserIds: { 'Paul Love': HOST } }),
      board('B', ['Paul Love']),
      board('C', ['Paul Love'])
    ]);
    expect(players.map(player => player.key)).toEqual([`${HOST}/Paul Love`]);
    expect(players[0].games.length).toBe(3);
    expect(players[0].sameNameIndex).toBe(0);
  });

  it('keeps a typed name apart from an account with the same name', () => {
    const players = playersAcrossGames([board('A', ['Pat']), board('B', ['Pat'], { playerUserIds: { Pat: 'pat-uid' } })]);
    expect(players.map(player => player.key)).toEqual([`${HOST}/Pat`, 'pat-uid']);
    expect(players.map(player => player.sameNameIndex)).toEqual([1, 2]);
  });

  it("treats a co-host's typed names as the co-host's, not a player's account", () => {
    const players = playersAcrossGames([board('A', ['Lee'], { managerId: 'co-uid', playerUserIds: { Lee: 'co-uid' } })]);
    expect(players[0].key).toBe('co-uid/Lee');
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

  it('counts every square on a newly added game as new for a player the host confirmed on another game', () => {
    const accounts = { Jo: 'jo-uid', Kim: 'kim-uid' };
    const players = playersAcrossGames([
      board('A', ['Jo', 'Jo', 'Kim'], { playerUserIds: accounts, paidPlayers: ['Jo'], paidSquares: [2] }),
      board('B', ['Kim', 'Kim', 'Jo', 'Jo', 'Jo'], { playerUserIds: accounts })
    ]);
    // Jo was confirmed on A, then picked 3 on the new game B: new, and first. Kim was never confirmed: Not yet.
    expect(players.map(player => player.name)).toEqual(['Jo', 'Kim']);
    expect(players[0].games.map(game => game.newSquares)).toEqual([0, 3]);
    expect(players[0].newSquares).toBe(3);
    expect(players[1].newSquares).toBe(0);
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

  it('puts players with new squares first, then the most points, then the most squares', () => {
    const players = playersAcrossGames([
      board('A', ['Amy', 'Bo', 'Bo', 'Cy', 'Cy', 'Cy', 'Dee', 'Dee'], {
        playerUserIds: { Amy: 'amy-uid', Bo: 'bo-uid', Cy: 'cy-uid', Dee: 'dee-uid' },
        paidPlayers: ['Amy'],
        paidSquares: [0]
      }),
      board('B', ['Dee'], { playerUserIds: { Dee: 'dee-uid' }, pricePerSquare: 0 })
    ]);
    // Amy added a square after her Confirm, so she leads with the fewest points. Dee and Bo tie on points; Dee has more squares.
    expect(players.map(player => player.name)).toEqual(['Amy', 'Cy', 'Dee', 'Bo']);
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

  it('lists unconfirmed games first on a phone and folds away confirmed ones past five', () => {
    const boards = 'ABCDEFG'.split('').map((id, i) => board(id, ['Kim'], {
      playerUserIds: { Kim: 'kim-uid' },
      ...(i % 2 === 0 ? { paidPlayers: ['Kim'], paidSquares: [1] } : {})
    }));
    const [player] = playersAcrossGames(boards);
    const folded = phoneGames(player.games, false);
    expect(folded.shown.map(game => game.gameId)).toEqual(['B', 'D', 'F', 'A', 'C']);
    expect(folded.hidden).toBe(2);
    expect(phoneGames(player.games, true).hidden).toBe(0);
  });

  it('keeps each phone row on the same game while the host toggles, so a tap never lands on another game', () => {
    const names = 'ABCDEFG'.split('');
    const unpaid = playersAcrossGames(names.map(id => board(id, ['Kim'], { playerUserIds: { Kim: 'kim-uid' } })))[0];
    const opened = phoneLayout(unpaid.games);
    expect(phoneGames(unpaid.games, false, opened).shown.map(game => game.gameId)).toEqual(names);

    // The host confirms A and B: they stay in the top two rows, and no unconfirmed game folds away.
    const toggled = playersAcrossGames(names.map(id => board(id, ['Kim'], {
      playerUserIds: { Kim: 'kim-uid' },
      ...(id === 'A' || id === 'B' ? { paidPlayers: ['Kim'], paidSquares: [1] } : {})
    })))[0];
    const shown = phoneGames(toggled.games, false, opened);
    expect(shown.shown.map(game => game.gameId)).toEqual(names);
    expect(shown.shown.slice(0, 2).map(game => game.confirmed)).toEqual([true, true]);
    expect(shown.hidden).toBe(0);
  });
});
