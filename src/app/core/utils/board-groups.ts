import type { GameListItem } from '../services/game.service';

export type BoardGroupKey = 'ready' | 'filling' | 'locked';

export interface BoardGroup {
  games: GameListItem[];
  key: BoardGroupKey;
  label: string;
}

type GroupableBoard = Pick<GameListItem, 'boardSize' | 'isLocked' | 'squaresFilled'>;

/** Sorts hosted boards by what the host does next: lock it, keep sharing it, or nothing. Keeps the given order inside each group and leaves out empty groups. */
export function groupBoards(games: GameListItem[]): BoardGroup[] {
  const groups: BoardGroup[] = [
    { games: [], key: 'ready', label: 'Ready to lock' },
    { games: [], key: 'filling', label: 'Filling' },
    { games: [], key: 'locked', label: 'Locked' }
  ];
  for (const game of games) {
    const key: BoardGroupKey = game.isLocked ? 'locked' : isBoardFull(game) ? 'ready' : 'filling';
    groups.find(g => g.key === key)!.games.push(game);
  }
  return groups.filter(g => g.games.length > 0);
}

/** Every square on the board is claimed. */
export function isBoardFull(game: GroupableBoard): boolean {
  return game.squaresFilled >= (game.boardSize || 100);
}

/** Unlocked with open squares left, so sharing the board still helps. */
export function isBoardFilling(game: GroupableBoard): boolean {
  return !game.isLocked && !isBoardFull(game);
}

/** Full and still open: the host can lock it from the dashboard card. */
export function isReadyToLock(game: GroupableBoard): boolean {
  return !game.isLocked && isBoardFull(game);
}

/** When Auto-lock and draw will lock this open board, or null when it is off, already locked or its time has passed. */
export function autoLockAt(game: Pick<GameListItem, 'autoManage' | 'isLocked'>, now = Date.now()): number | null {
  const runAt = game.autoManage?.enabled ? game.autoManage.runAt : undefined;
  return !game.isLocked && runAt && runAt > now ? runAt : null;
}
