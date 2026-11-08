import { planAutoManage, readSettings } from "./auto-manage";

export interface AutoManageRunDeps {
  /** autoManageQueue entries whose run time has come: { boardId: runAtMs }. */
  readDue: (now: number) => Promise<Record<string, number> | null>;
  readGame: (boardId: string) => Promise<unknown>;
  update: (updates: Record<string, unknown>) => Promise<void>;
  now?: () => number;
  log?: (message: string, details?: Record<string, unknown>) => void;
}

const BOARD_ID = /^[A-Za-z0-9]{6}$/;

/**
 * Runs every board whose time has come. A board is dropped from the queue after it runs,
 * and also when the host switched it off, the game is gone, or the queue time no longer
 * matches the board (a stale row never locks anything).
 */
export async function runDueAutoManage(deps: AutoManageRunDeps): Promise<{ due: number; ran: number }> {
  const now = (deps.now ?? Date.now)();
  const due = (await deps.readDue(now)) ?? {};
  const ids = Object.keys(due).filter((id) => BOARD_ID.test(id));
  const updates: Record<string, unknown> = {};
  let ran = 0;
  for (const boardId of ids) {
    const raw = await deps.readGame(boardId);
    const board = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    updates[`autoManageQueue/${boardId}`] = null;
    if (!board || !readSettings(board)) continue;
    const plan = planAutoManage(boardId, board, now);
    if (plan) {
      Object.assign(updates, plan);
      ran += 1;
      deps.log?.("auto-manage ran", { boardId });
    }
  }
  if (Object.keys(updates).length > 0) await deps.update(updates);
  return { due: ids.length, ran };
}
