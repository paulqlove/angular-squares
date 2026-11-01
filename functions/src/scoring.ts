/**
 * Quarter scores and winners for a squares board.
 *
 * This matches syncFromEspn() and calculateWinnersFromEspn() in
 * src/app/features/super-bowl-squares/super-bowl-squares.component.ts:
 * ESPN linescores are per quarter, the board stores cumulative scores,
 * and a finished game (including OT and the Pro Bowl) puts the final
 * total in q4. Q1–Q3 winners require the period to have passed that
 * quarter. The Q4 winner requires ESPN to mark the game completed.
 */

export type GameStatus = "pre" | "in" | "post";

export interface QuarterScore {
  home: number;
  away: number;
}

export interface QuarterScores {
  q1: QuarterScore;
  q2: QuarterScore;
  q3: QuarterScore;
  q4: QuarterScore;
}

export const QUARTER_KEYS = ["q1", "q2", "q3", "q4"] as const;

export interface ParsedEspnGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  status: GameStatus;
  completed: boolean;
  quarters: QuarterScore[];
  date: string;
}

/** Box-score fields written beside the cumulative scores. */
export interface EspnLiveSnapshot {
  status: GameStatus;
  period: number;
  clock: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  quarters: QuarterScore[];
}

export interface BoardSnapshot {
  squares: Record<string, string>;
  homeNumbers: (number | null)[];
  awayNumbers: (number | null)[];
  scores: QuarterScores;
  winners: Record<string, string>;
  espnLive?: EspnLiveSnapshot | null;
  espnEventId?: string | null;
}

export interface PlannedWrite {
  scores?: QuarterScores;
  winners?: Record<string, string>;
  espnLive?: EspnLiveSnapshot;
  /** Game is final, so the liveGames index entry should be removed. */
  dropFromLiveIndex: boolean;
}

export function emptyScores(): QuarterScores {
  return {
    q1: { home: 0, away: 0 },
    q2: { home: 0, away: 0 },
    q3: { home: 0, away: 0 },
    q4: { home: 0, away: 0 },
  };
}

export function cumulativeQuarterScores(
  game: Pick<ParsedEspnGame, "quarters" | "status" | "homeScore" | "awayScore">
): QuarterScores {
  let homeAccum = 0;
  let awayAccum = 0;
  const scores = emptyScores();

  for (let i = 0; i < 4; i++) {
    homeAccum += game.quarters[i]?.home || 0;
    awayAccum += game.quarters[i]?.away || 0;
    scores[QUARTER_KEYS[i]] = { home: homeAccum, away: awayAccum };
  }

  if (game.status === "post") {
    scores.q4 = { home: game.homeScore, away: game.awayScore };
  }

  return scores;
}

export function winnerForScore(
  homeScore: number,
  awayScore: number,
  squares: Record<string, string>,
  homeNumbers: (number | null)[],
  awayNumbers: (number | null)[]
): string | null {
  const homeLastDigit = homeScore % 10;
  const awayLastDigit = awayScore % 10;
  const winningSquare = Object.entries(squares).find(([key]) => {
    const [row, col] = key.split("-").map(Number);
    return awayNumbers[row] === awayLastDigit && homeNumbers[col] === homeLastDigit;
  });
  return winningSquare ? winningSquare[1] : null;
}

export function winnersForCompletedQuarters(
  scores: QuarterScores,
  period: number,
  completed: boolean,
  squares: Record<string, string>,
  homeNumbers: (number | null)[],
  awayNumbers: (number | null)[]
): Record<string, string> {
  const winners: Record<string, string> = {};

  QUARTER_KEYS.forEach((quarter, index) => {
    const isComplete = index === 3 ? completed : period > index + 1;
    if (!isComplete) return;
    const score = scores[quarter];
    const winner = winnerForScore(score.home, score.away, squares, homeNumbers, awayNumbers);
    if (winner) winners[quarter] = winner;
  });

  return winners;
}

export function scoresEqual(a: QuarterScores, b: QuarterScores): boolean {
  return QUARTER_KEYS.every(
    (quarter) => a[quarter].home === b[quarter].home && a[quarter].away === b[quarter].away
  );
}

export function winnersEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function espnLiveFromGame(game: ParsedEspnGame): EspnLiveSnapshot {
  return {
    status: game.status,
    period: game.period,
    clock: game.clock,
    completed: game.completed,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    quarters: game.quarters.map((quarter) => ({
      home: quarter.home || 0,
      away: quarter.away || 0,
    })),
  };
}

export function espnLiveEqual(a: EspnLiveSnapshot | null | undefined, b: EspnLiveSnapshot): boolean {
  if (!a) return false;
  if (
    a.status !== b.status ||
    a.period !== b.period ||
    a.clock !== b.clock ||
    a.completed !== b.completed ||
    a.homeScore !== b.homeScore ||
    a.awayScore !== b.awayScore ||
    a.homeTeam !== b.homeTeam ||
    a.awayTeam !== b.awayTeam ||
    a.quarters.length !== b.quarters.length
  ) {
    return false;
  }
  return a.quarters.every(
    (quarter, index) => quarter.home === b.quarters[index].home && quarter.away === b.quarters[index].away
  );
}

export function planBoardSync(game: ParsedEspnGame, board: BoardSnapshot): PlannedWrite {
  const scores = cumulativeQuarterScores(game);
  const winners = winnersForCompletedQuarters(
    scores,
    game.period,
    game.completed,
    board.squares,
    board.homeNumbers,
    board.awayNumbers
  );
  const espnLive = espnLiveFromGame(game);
  const plan: PlannedWrite = { dropFromLiveIndex: game.status === "post" };

  if (!scoresEqual(board.scores, scores)) plan.scores = scores;
  if (!winnersEqual(board.winners, winners)) plan.winners = winners;
  if (!espnLiveEqual(board.espnLive, espnLive)) plan.espnLive = espnLive;
  return plan;
}

export function rtdbUpdatesForBoard(
  espnId: string,
  boardId: string,
  plan: PlannedWrite
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (plan.scores) updates[`games/${boardId}/scores`] = plan.scores;
  if (plan.winners) updates[`games/${boardId}/winners`] = plan.winners;
  if (plan.espnLive) updates[`games/${boardId}/espnLive`] = plan.espnLive;
  if (plan.dropFromLiveIndex) updates[`liveGames/${espnId}/${boardId}`] = null;
  return updates;
}

export function normalizeNumbers(value: unknown): (number | null)[] {
  const numbers: (number | null)[] = Array(10).fill(null);
  if (Array.isArray(value)) {
    for (let i = 0; i < 10 && i < value.length; i++) {
      numbers[i] = typeof value[i] === "number" ? value[i] : null;
    }
    return numbers;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < 10) {
        numbers[index] = typeof entry === "number" ? entry : null;
      }
    }
  }
  return numbers;
}

export function normalizeScores(value: unknown): QuarterScores {
  const scores = emptyScores();
  if (!value || typeof value !== "object") return scores;
  for (const quarter of QUARTER_KEYS) {
    const row = (value as Record<string, unknown>)[quarter];
    if (!row || typeof row !== "object") continue;
    const home = (row as Record<string, unknown>)["home"];
    const away = (row as Record<string, unknown>)["away"];
    scores[quarter] = {
      home: typeof home === "number" ? home : 0,
      away: typeof away === "number" ? away : 0,
    };
  }
  return scores;
}

function stringMap(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

export function normalizeEspnLive(value: unknown): EspnLiveSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const status = raw["status"];
  if (status !== "pre" && status !== "in" && status !== "post") return null;
  const quartersRaw = Array.isArray(raw["quarters"]) ? raw["quarters"] : [];
  return {
    status,
    period: typeof raw["period"] === "number" ? raw["period"] : 0,
    clock: typeof raw["clock"] === "string" ? raw["clock"] : "",
    completed: raw["completed"] === true,
    homeScore: typeof raw["homeScore"] === "number" ? raw["homeScore"] : 0,
    awayScore: typeof raw["awayScore"] === "number" ? raw["awayScore"] : 0,
    homeTeam: typeof raw["homeTeam"] === "string" ? raw["homeTeam"] : "",
    awayTeam: typeof raw["awayTeam"] === "string" ? raw["awayTeam"] : "",
    quarters: quartersRaw.map((quarter) => {
      const row = quarter && typeof quarter === "object" ? (quarter as Record<string, unknown>) : {};
      return {
        home: typeof row["home"] === "number" ? row["home"] : 0,
        away: typeof row["away"] === "number" ? row["away"] : 0,
      };
    }),
  };
}

export function boardFromRaw(value: unknown): BoardSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const squares = stringMap(raw["squares"]) ?? stringMap(raw["selectedSquares"]) ?? {};
  const winners = stringMap(raw["winners"]) ?? {};
  const espnEventId = typeof raw["espnEventId"] === "string" && raw["espnEventId"]
    ? raw["espnEventId"]
    : null;
  return {
    squares,
    homeNumbers: normalizeNumbers(raw["homeNumbers"]),
    awayNumbers: normalizeNumbers(raw["awayNumbers"]),
    scores: normalizeScores(raw["scores"]),
    winners,
    espnLive: normalizeEspnLive(raw["espnLive"]),
    espnEventId,
  };
}
