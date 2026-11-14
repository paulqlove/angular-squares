import type { GameData } from './game-data';
import { paidCountsByName, paidSquaresFor, squaresByPlayer } from './paid-squares';

/** The parts of a board tied to player names. */
export type BoardPlayers = Pick<GameData, 'selectedSquares' | 'playerColors' | 'paidPlayers' | 'paidSquares' | 'playerUserIds' | 'winners'>;

/** A board's Confirm marks, as saved. */
export type BoardConfirms = Required<Pick<GameData, 'paidPlayers'>> & { paidSquares: number[] };

/** The Confirm marks after the host confirms one player: it covers the squares they hold now; everyone else keeps theirs. */
export function withPlayerConfirmed(board: Pick<GameData, 'selectedSquares' | 'paidPlayers' | 'paidSquares'>, name: string): BoardConfirms {
  const paid = board.paidPlayers ?? [];
  const paidPlayers = paid.includes(name) ? [...paid] : [...paid, name];
  const held = squaresByPlayer(board.selectedSquares)[name] ?? 0;
  const paidSquares = paidSquaresFor(board.selectedSquares, paidPlayers, paidCountsByName(paid, board.paidSquares), { [name]: held });
  return { paidPlayers, paidSquares };
}

/** The board with one player taken off: their squares freed and everything tied to their name cleared. */
export function withoutPlayer(board: BoardPlayers, name: string): Required<Omit<BoardPlayers, 'paidSquares'>> & { paidSquares: number[] } {
  const selectedSquares = without(board.selectedSquares, (_, player) => player === name);
  const paid = board.paidPlayers ?? [];
  const paidPlayers = paid.filter(player => player !== name);
  return {
    selectedSquares,
    playerColors: without(board.playerColors ?? {}, key => key === name),
    paidPlayers,
    paidSquares: paidSquaresFor(selectedSquares, paidPlayers, paidCountsByName(paid, board.paidSquares)),
    playerUserIds: without(board.playerUserIds ?? {}, key => key === name),
    winners: without(board.winners ?? {}, (_, player) => player === name)
  };
}

function without<T>(map: { [key: string]: T }, drop: (key: string, value: T) => boolean): { [key: string]: T } {
  return Object.fromEntries(Object.entries(map).filter(([key, value]) => !drop(key, value)));
}
