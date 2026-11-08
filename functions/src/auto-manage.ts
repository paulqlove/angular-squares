import { ParsedEspnGame } from "./scoring";

/** The board locks and draws this long before kickoff. */
export const AUTO_MANAGE_LEAD_MS = 15 * 60 * 1000;

export type BoardSize = 25 | 50 | 100;

export interface AutoManageSettings {
  enabled: boolean;
  /** Also shrink a half-empty board (100 to 50 or 25, 50 to 25) before drawing. */
  resize: boolean;
}

export interface AutoManageResult {
  state: "done" | "skipped" | "missed";
  at: number;
  note: string;
  locked?: boolean;
  drawn?: boolean;
  resizedFrom?: BoardSize;
  resizedTo?: BoardSize;
}

export function dimensions(size: BoardSize): { rows: number; cols: number } {
  if (size === 25) return { rows: 5, cols: 5 };
  if (size === 50) return { rows: 5, cols: 10 };
  return { rows: 10, cols: 10 };
}

function asSize(value: unknown): BoardSize {
  return value === 25 || value === 50 ? value : 100;
}

/** Smallest board the picks fit on, or null when the board should stay as it is. */
export function smallestFit(size: BoardSize, filled: number): BoardSize | null {
  const fit = ([25, 50] as BoardSize[]).find((s) => s < size && filled <= s);
  return fit ?? null;
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Every pick lands in an equally likely empty cell of the smaller grid; each player keeps their count. */
export function reshuffleSquares(
  squares: Record<string, string>,
  rows: number,
  cols: number,
  rng: () => number = Math.random
): Record<string, string> | null {
  const players = Object.values(squares);
  if (players.length > rows * cols) return null;
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(`${r}-${c}`);
  const order = shuffled(cells, rng);
  return Object.fromEntries(players.map((name, i) => [order[i], name]));
}

/** 10 lines draw digits 0-9; 5 lines draw pair groups 0-4 (group 0 is digits 0 and 1). */
export function drawLine(count: number, rng: () => number = Math.random): number[] {
  const n = count === 10 ? 10 : 5;
  return shuffled(Array.from({ length: n }, (_, i) => i), rng);
}

export function readSettings(raw: Record<string, unknown>): AutoManageSettings | null {
  const value = raw["autoManage"];
  if (!value || typeof value !== "object") return null;
  const settings = value as Record<string, unknown>;
  if (settings["enabled"] !== true) return null;
  return { enabled: true, resize: settings["resize"] === true };
}

function squaresOf(raw: Record<string, unknown>): Record<string, string> {
  const source = raw["squares"] ?? raw["selectedSquares"];
  if (!source || typeof source !== "object") return {};
  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v)
  ) as Record<string, string>;
}

/**
 * Database updates for one board, or null when it is not time (or nothing to do).
 * Runs once: it always ends by writing autoManageResult, and a board that already
 * has one is left alone. The host cancels by switching autoManage off.
 */
export function planAutoManage(
  boardId: string,
  raw: Record<string, unknown>,
  game: ParsedEspnGame,
  now: number,
  rng: () => number = Math.random
): Record<string, unknown> | null {
  const settings = readSettings(raw);
  if (!settings || raw["autoManageResult"]) return null;

  const start = Date.parse(game.date);
  if (!Number.isFinite(start)) return null;
  if (game.status === "pre" && now < start - AUTO_MANAGE_LEAD_MS) return null;

  const prefix = `games/${boardId}`;
  const finish = (result: AutoManageResult, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...extra,
    [`${prefix}/autoManageResult`]: result,
  });

  if (game.status !== "pre") {
    return finish({ state: "missed", at: now, note: "The game had already started, so nothing was changed." });
  }

  const locked = raw["isLocked"] === true;
  const drawn = raw["isRandomized"] === true;
  let size = asSize(raw["boardSize"]);
  let squares = squaresOf(raw);
  const filled = Object.keys(squares).length;

  if (locked && drawn) {
    return finish({ state: "skipped", at: now, note: "Already locked and drawn, so nothing was changed." });
  }
  if (filled === 0) {
    return finish({ state: "skipped", at: now, note: "No squares were picked, so the board was left open." });
  }

  const updates: Record<string, unknown> = { [`${prefix}/isLocked`]: true };
  const result: AutoManageResult = { state: "done", at: now, note: "", locked: true, drawn: true };

  if (!drawn && settings.resize) {
    const target = smallestFit(size, filled);
    if (target) {
      const dim = dimensions(target);
      const reshuffled = reshuffleSquares(squares, dim.rows, dim.cols, rng);
      if (reshuffled) {
        result.resizedFrom = size;
        result.resizedTo = target;
        size = target;
        squares = reshuffled;
        updates[`${prefix}/boardSize`] = target;
        updates[`${prefix}/squares`] = reshuffled;
      }
    }
  }

  if (!drawn) {
    const dim = dimensions(size);
    updates[`${prefix}/homeNumbers`] = drawLine(dim.cols, rng);
    updates[`${prefix}/awayNumbers`] = drawLine(dim.rows, rng);
    updates[`${prefix}/isRandomized`] = true;
    updates[`${prefix}/winners`] = {};
  } else {
    result.drawn = false;
  }

  result.note = result.resizedTo
    ? `Locked, shrunk from ${result.resizedFrom} to ${result.resizedTo} squares and drew the numbers.`
    : drawn
      ? "Locked. The numbers were already drawn."
      : "Locked and drew the numbers.";
  return finish(result, updates);
}
