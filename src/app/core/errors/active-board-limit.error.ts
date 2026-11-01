/** Thrown when a free host already has an active board. The UI shows the upgrade dialog. */
export class ActiveBoardLimitError extends Error {
  constructor() {
    super('Free hosting includes one active board.');
    this.name = 'ActiveBoardLimitError';
  }
}
