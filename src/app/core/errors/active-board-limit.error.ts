import type { BoardLimitDialog } from '../utils/board-activity';

/** Thrown when a host is at their active-board limit. dialog says which version of the limit dialog the UI shows. */
export class ActiveBoardLimitError extends Error {
  constructor(public readonly dialog: BoardLimitDialog) {
    super('Active board limit reached.');
    this.name = 'ActiveBoardLimitError';
  }
}
