import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardFromRaw,
  cumulativeQuarterScores,
  emptyScores,
  espnLiveFromGame,
  normalizeNumbers,
  planBoardSync,
  PlannedWrite,
  ParsedEspnGame,
  QuarterScores,
  rtdbUpdatesForBoard,
  winnerForScore,
  winnersForCompletedQuarters,
} from "./scoring";

const HOME = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const AWAY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function game(overrides: Partial<ParsedEspnGame> = {}): ParsedEspnGame {
  return {
    id: "401000",
    name: "SF at KC",
    homeTeam: "KC",
    awayTeam: "SF",
    homeScore: 0,
    awayScore: 0,
    period: 1,
    clock: "12:00",
    status: "in",
    completed: false,
    quarters: [
      { home: 0, away: 0 },
      { home: 0, away: 0 },
      { home: 0, away: 0 },
      { home: 0, away: 0 },
    ],
    date: "2026-02-08T23:30:00Z",
    ...overrides,
  };
}

function squaresForDigits(): Record<string, string> {
  return {
    "3-7": "Ada",
    "0-4": "Grace",
    "7-0": "Lin",
  };
}

describe("cumulativeQuarterScores", () => {
  it("adds per-quarter linescores into running totals", () => {
    const scores = cumulativeQuarterScores(game({
      quarters: [
        { home: 7, away: 3 },
        { home: 7, away: 0 },
        { home: 3, away: 7 },
        { home: 0, away: 3 },
      ],
      homeScore: 17,
      awayScore: 13,
      status: "in",
    }));

    assert.deepEqual(scores, {
      q1: { home: 7, away: 3 },
      q2: { home: 14, away: 3 },
      q3: { home: 17, away: 10 },
      q4: { home: 17, away: 13 },
    });
  });

  it("treats a missing quarter as zero", () => {
    const scores = cumulativeQuarterScores(game({
      quarters: [{ home: 3, away: 0 }],
      status: "in",
    }));
    assert.deepEqual(scores.q1, { home: 3, away: 0 });
    assert.deepEqual(scores.q2, { home: 3, away: 0 });
    assert.deepEqual(scores.q4, { home: 3, away: 0 });
  });

  it("replaces q4 with the final total so overtime and a 3-period game are included", () => {
    const overtime = cumulativeQuarterScores(game({
      status: "post",
      completed: true,
      homeScore: 27,
      awayScore: 24,
      quarters: [
        { home: 7, away: 7 },
        { home: 7, away: 7 },
        { home: 3, away: 7 },
        { home: 7, away: 3 },
        { home: 3, away: 0 },
      ],
    }));
    assert.deepEqual(overtime.q3, { home: 17, away: 21 });
    assert.deepEqual(overtime.q4, { home: 27, away: 24 });

    const proBowl = cumulativeQuarterScores(game({
      status: "post",
      completed: true,
      homeScore: 30,
      awayScore: 20,
      quarters: [
        { home: 10, away: 7 },
        { home: 10, away: 6 },
        { home: 10, away: 7 },
      ],
    }));
    assert.deepEqual(proBowl.q3, { home: 30, away: 20 });
    assert.deepEqual(proBowl.q4, { home: 30, away: 20 });
  });

  it("keeps the four-quarter sum in q4 while the game is still in progress", () => {
    const scores = cumulativeQuarterScores(game({
      status: "in",
      period: 5,
      homeScore: 27,
      awayScore: 24,
      quarters: [
        { home: 7, away: 7 },
        { home: 7, away: 7 },
        { home: 3, away: 7 },
        { home: 7, away: 3 },
        { home: 3, away: 0 },
      ],
    }));
    assert.deepEqual(scores.q4, { home: 24, away: 24 });
  });
});

describe("winnersForCompletedQuarters", () => {
  const squares = squaresForDigits();

  it("matches the away last digit to the row and the home last digit to the column", () => {
    assert.equal(winnerForScore(17, 3, squares, HOME, AWAY), "Ada");
    assert.equal(winnerForScore(14, 10, squares, HOME, AWAY), "Grace");
    assert.equal(winnerForScore(20, 17, squares, HOME, AWAY), "Lin");
    assert.equal(winnerForScore(11, 2, squares, HOME, AWAY), null);
  });

  it("uses the first claimed square when two squares share the winning digits", () => {
    const claimed = { "1-1": "First", "8-8": "Second" };
    const numbers = [9, 1, 2, 3, 4, 5, 6, 7, 8, 0];
    assert.equal(winnerForScore(11, 21, claimed, numbers, numbers), "First");
  });

  it("awards no winner when the square is open or the numbers are not randomized", () => {
    assert.equal(winnerForScore(17, 3, {}, HOME, AWAY), null);
    assert.equal(
      winnerForScore(17, 3, squares, Array(10).fill(null), Array(10).fill(null)),
      null
    );
  });

  it("awards Q1-Q3 only after that period has passed, and Q4 only when completed", () => {
    const scores: QuarterScores = {
      q1: { home: 7, away: 3 },
      q2: { home: 14, away: 10 },
      q3: { home: 14, away: 10 },
      q4: { home: 20, away: 17 },
    };

    assert.deepEqual(winnersForCompletedQuarters(scores, 1, false, squares, HOME, AWAY), {});
    assert.deepEqual(winnersForCompletedQuarters(scores, 2, false, squares, HOME, AWAY), {
      q1: "Ada",
    });
    assert.deepEqual(winnersForCompletedQuarters(scores, 3, false, squares, HOME, AWAY), {
      q1: "Ada",
      q2: "Grace",
    });
    assert.deepEqual(winnersForCompletedQuarters(scores, 4, false, squares, HOME, AWAY), {
      q1: "Ada",
      q2: "Grace",
      q3: "Grace",
    });
    assert.deepEqual(winnersForCompletedQuarters(scores, 4, true, squares, HOME, AWAY), {
      q1: "Ada",
      q2: "Grace",
      q3: "Grace",
      q4: "Lin",
    });
  });

  it("does not award Q3 of a 3-period final unless the period is past 3", () => {
    const scores = cumulativeQuarterScores(game({
      status: "post",
      completed: true,
      period: 3,
      homeScore: 20,
      awayScore: 17,
      quarters: [
        { home: 7, away: 3 },
        { home: 7, away: 7 },
        { home: 6, away: 0 },
      ],
    }));
    const winners = winnersForCompletedQuarters(scores, 3, true, squares, HOME, AWAY);
    assert.equal(winners["q1"], "Ada");
    assert.equal(winners["q2"], "Grace");
    assert.equal(winners["q3"], undefined);
    assert.equal(winners["q4"], "Lin");
  });
});

describe("planBoardSync", () => {
  const board = {
    squares: squaresForDigits(),
    homeNumbers: HOME,
    awayNumbers: AWAY,
    scores: emptyScores(),
    winners: {},
    espnLive: null,
    espnEventId: "401000",
  };

  it("writes scores, winners, and the live snapshot only when they change", () => {
    const live = game({
      period: 2,
      clock: "8:01",
      status: "in",
      homeScore: 14,
      awayScore: 3,
      quarters: [
        { home: 7, away: 3 },
        { home: 7, away: 0 },
        { home: 0, away: 0 },
        { home: 0, away: 0 },
      ],
    });

    const first = planBoardSync(live, board);
    assert.deepEqual(first.scores, {
      q1: { home: 7, away: 3 },
      q2: { home: 14, away: 3 },
      q3: { home: 14, away: 3 },
      q4: { home: 14, away: 3 },
    });
    assert.deepEqual(first.winners, { q1: "Ada" });
    assert.equal(first.dropFromLiveIndex, false);
    assert.ok(first.espnLive);

    const second = planBoardSync(live, {
      ...board,
      scores: first.scores!,
      winners: first.winners!,
      espnLive: first.espnLive,
    });
    assert.equal(second.scores, undefined);
    assert.equal(second.winners, undefined);
    assert.equal(second.espnLive, undefined);
    assert.equal(second.dropFromLiveIndex, false);
    assert.deepEqual(rtdbUpdatesForBoard("401000", "ABC234", second), {});
  });

  it("writes the box score when only the clock changed", () => {
    const base = game({
      period: 2,
      clock: "8:01",
      status: "in",
      homeScore: 7,
      awayScore: 3,
      quarters: [
        { home: 7, away: 3 },
        { home: 0, away: 0 },
        { home: 0, away: 0 },
        { home: 0, away: 0 },
      ],
    });
    const seeded = planBoardSync(base, board);
    assert.ok(seeded.scores);
    assert.ok(seeded.espnLive);
    const ticked = planBoardSync(game({ ...base, clock: "7:01" }), {
      ...board,
      scores: seeded.scores!,
      winners: seeded.winners!,
      espnLive: seeded.espnLive,
    });
    assert.equal(ticked.scores, undefined);
    assert.equal(ticked.winners, undefined);
    assert.equal(ticked.espnLive?.clock, "7:01");
  });

  it("writes the final score once and drops the live index", () => {
    const finalGame = game({
      status: "post",
      completed: true,
      period: 4,
      clock: "0:00",
      homeScore: 20,
      awayScore: 17,
      quarters: [
        { home: 7, away: 7 },
        { home: 7, away: 7 },
        { home: 3, away: 7 },
        { home: 7, away: 3 },
        { home: 3, away: 0 },
      ],
    });
    const plan = planBoardSync(finalGame, board);
    assert.equal(plan.dropFromLiveIndex, true);
    assert.deepEqual(plan.scores?.q4, { home: 20, away: 17 });
    assert.equal(plan.winners?.["q4"], "Lin");

    const paths = rtdbUpdatesForBoard("401000", "ABC234", plan);
    assert.equal(paths["liveGames/401000/ABC234"], null);
    assert.equal(paths["games/ABC234/scores"], plan.scores);
    assert.equal(paths["games/ABC234/winners"], plan.winners);

    const again = planBoardSync(finalGame, {
      ...board,
      scores: plan.scores!,
      winners: plan.winners!,
      espnLive: espnLiveFromGame(finalGame),
    });
    assert.deepEqual(rtdbUpdatesForBoard("401000", "ABC234", again), {
      "liveGames/401000/ABC234": null,
    });
    assert.equal(changedFields(again), false);
  });
});

describe("board normalization", () => {
  it("reads squares from the Firebase squares map and fills number holes", () => {
    const board = boardFromRaw({
      squares: { "3-7": "Ada" },
      selectedSquares: { "0-0": "ignored" },
      homeNumbers: { 0: 4, 3: 7, 1: null },
      awayNumbers: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9],
      scores: { q1: { home: 7, away: 3 } },
      winners: { q1: "Ada" },
      espnEventId: "401000",
    });
    assert.ok(board);
    assert.deepEqual(board?.squares, { "3-7": "Ada" });
    assert.equal(board?.homeNumbers[0], 4);
    assert.equal(board?.homeNumbers[1], null);
    assert.equal(board?.homeNumbers[3], 7);
    assert.deepEqual(board?.scores.q1, { home: 7, away: 3 });
    assert.deepEqual(board?.scores.q4, { home: 0, away: 0 });
    assert.equal(board?.espnEventId, "401000");
  });
});

function changedFields(plan: PlannedWrite): boolean {
  return !!(plan.scores || plan.winners || plan.espnLive);
}
