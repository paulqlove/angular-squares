import { isSportType, SportType } from "./espn";
import {
  boardFromRaw,
  ParsedEspnGame,
  planBoardSync,
  PlannedWrite,
  rtdbUpdatesForBoard,
} from "./scoring";

export interface LiveBoardRef {
  espnId: string;
  boardId: string;
  sport: SportType;
}

export interface SyncDeps {
  readLiveGames: () => Promise<unknown>;
  readGame: (boardId: string) => Promise<unknown>;
  update: (updates: Record<string, unknown>) => Promise<void>;
  fetchScoreboard: (sport: SportType) => Promise<ParsedEspnGame[]>;
  log?: (message: string, details?: Record<string, unknown>) => void;
}

export interface SyncResult {
  leagues: number;
  fetchedGames: number;
  boardsConsidered: number;
  boardsWritten: number;
  finalized: number;
}

const ESPN_ID = /^[A-Za-z0-9_-]{1,50}$/;
const BOARD_ID = /^[A-Za-z0-9]{6}$/;

/** Flatten liveGames/{espnId}/{boardId} into one row per linked board. */
export function groupLiveBoards(node: unknown): LiveBoardRef[] {
  if (!node || typeof node !== "object") return [];
  const boards: LiveBoardRef[] = [];
  for (const [espnId, children] of Object.entries(node as Record<string, unknown>)) {
    if (!ESPN_ID.test(espnId) || !children || typeof children !== "object") continue;
    for (const [boardId, meta] of Object.entries(children as Record<string, unknown>)) {
      if (!BOARD_ID.test(boardId) || !meta || typeof meta !== "object") continue;
      const sport = (meta as Record<string, unknown>)["sport"];
      if (typeof sport !== "string" || !isSportType(sport)) continue;
      boards.push({ espnId, boardId, sport });
    }
  }
  return boards;
}

/**
 * One scoreboard fetch per league. Each ESPN id is applied to every board
 * linked to it. Scores, winners, and the box-score snapshot are written
 * only when they differ. A final game is removed from the index in the
 * same update as its last score write.
 */
export async function syncLiveScores(deps: SyncDeps): Promise<SyncResult> {
  const boards = groupLiveBoards(await deps.readLiveGames());
  const result: SyncResult = {
    leagues: 0,
    fetchedGames: 0,
    boardsConsidered: boards.length,
    boardsWritten: 0,
    finalized: 0,
  };
  if (boards.length === 0) {
    deps.log?.("no live boards");
    return result;
  }

  const bySport = new Map<SportType, LiveBoardRef[]>();
  for (const board of boards) {
    const list = bySport.get(board.sport) ?? [];
    list.push(board);
    bySport.set(board.sport, list);
  }
  result.leagues = bySport.size;

  const updates: Record<string, unknown> = {};

  for (const [sport, sportBoards] of bySport) {
    let games: ParsedEspnGame[];
    try {
      games = await deps.fetchScoreboard(sport);
    } catch (error) {
      deps.log?.(`scoreboard failed for ${sport}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    result.fetchedGames += games.length;
    const byId = new Map(games.map((game) => [game.id, game]));
    const espnIds = [...new Set(sportBoards.map((board) => board.espnId))];

    for (const espnId of espnIds) {
      const linked = sportBoards.filter((board) => board.espnId === espnId);
      const game = byId.get(espnId);
      for (const board of linked) {
        const raw = await deps.readGame(board.boardId);
        const snapshot = boardFromRaw(raw);
        if (!snapshot || snapshot.espnEventId !== espnId) {
          updates[`liveGames/${espnId}/${board.boardId}`] = null;
          continue;
        }
        if (!game) continue;

        const plan = planBoardSync(game, snapshot);
        applyPlan(updates, espnId, board.boardId, plan, result);
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await deps.update(updates);
  }
  deps.log?.("espn sync complete", { ...result });
  return result;
}

function applyPlan(
  updates: Record<string, unknown>,
  espnId: string,
  boardId: string,
  plan: PlannedWrite,
  result: SyncResult
): void {
  const boardUpdates = rtdbUpdatesForBoard(espnId, boardId, plan);
  if (plan.scores || plan.winners || plan.espnLive) result.boardsWritten += 1;
  if (plan.dropFromLiveIndex) result.finalized += 1;
  Object.assign(updates, boardUpdates);
}
