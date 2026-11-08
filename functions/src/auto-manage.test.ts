import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTO_MANAGE_LEAD_MS, drawLine, planAutoManage, reshuffleSquares, smallestFit } from "./auto-manage";
import { ParsedEspnGame } from "./scoring";

const KICKOFF = Date.parse("2026-11-08T18:00:00Z");

function game(overrides: Partial<ParsedEspnGame> = {}): ParsedEspnGame {
  return {
    id: "401",
    name: "A at B",
    homeTeam: "B",
    awayTeam: "A",
    homeScore: 0,
    awayScore: 0,
    period: 0,
    clock: "",
    status: "pre",
    completed: false,
    quarters: [],
    date: new Date(KICKOFF).toISOString(),
    ...overrides,
  };
}

function board(picks: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const squares: Record<string, string> = {};
  for (let i = 0; i < picks; i++) squares[`${Math.floor(i / 10)}-${i % 10}`] = i % 2 ? "Ann" : "Bo";
  return { boardSize: 100, squares, isLocked: false, isRandomized: false, autoManage: { enabled: true, resize: false }, ...extra };
}

const AT = KICKOFF - AUTO_MANAGE_LEAD_MS + 1000;

describe("planAutoManage", () => {
  it("does nothing before the lead time", () => {
    assert.equal(planAutoManage("ABC123", board(40), game(), KICKOFF - AUTO_MANAGE_LEAD_MS - 1), null);
  });

  it("does nothing when the switch is off or it already ran", () => {
    assert.equal(planAutoManage("ABC123", board(40, { autoManage: { enabled: false, resize: false } }), game(), AT), null);
    assert.equal(planAutoManage("ABC123", board(40, { autoManageResult: { state: "done" } }), game(), AT), null);
    assert.equal(planAutoManage("ABC123", { ...board(40), autoManage: undefined }, game(), AT), null);
  });

  it("locks and draws a valid 10x10 board without resizing", () => {
    const u = planAutoManage("ABC123", board(40), game(), AT)!;
    assert.equal(u["games/ABC123/isLocked"], true);
    assert.equal(u["games/ABC123/isRandomized"], true);
    assert.equal(u["games/ABC123/boardSize"], undefined);
    assert.deepEqual([...(u["games/ABC123/homeNumbers"] as number[])].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual([...(u["games/ABC123/awayNumbers"] as number[])].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const result = u["games/ABC123/autoManageResult"] as { state: string; resizedTo?: number };
    assert.equal(result.state, "done");
    assert.equal(result.resizedTo, undefined);
  });

  it("shrinks a half-empty board only when resize is on, keeping every pick", () => {
    const off = planAutoManage("ABC123", board(40), game(), AT)!;
    assert.equal(off["games/ABC123/boardSize"], undefined);

    const u = planAutoManage("ABC123", board(40, { autoManage: { enabled: true, resize: true } }), game(), AT)!;
    assert.equal(u["games/ABC123/boardSize"], 50);
    const squares = u["games/ABC123/squares"] as Record<string, string>;
    assert.equal(Object.keys(squares).length, 40);
    assert.equal(Object.values(squares).filter((n) => n === "Ann").length, 20);
    for (const key of Object.keys(squares)) {
      const [r, c] = key.split("-").map(Number);
      assert.ok(r < 5 && c < 10, key);
    }
    assert.equal((u["games/ABC123/homeNumbers"] as number[]).length, 10);
    assert.equal((u["games/ABC123/awayNumbers"] as number[]).length, 5);
    assert.deepEqual([...(u["games/ABC123/awayNumbers"] as number[])].sort(), [0, 1, 2, 3, 4]);
  });

  it("goes to 25 when 25 or fewer picks, and draws five groups on both sides", () => {
    const u = planAutoManage("ABC123", board(20, { autoManage: { enabled: true, resize: true } }), game(), AT)!;
    assert.equal(u["games/ABC123/boardSize"], 25);
    assert.equal((u["games/ABC123/homeNumbers"] as number[]).length, 5);
    assert.equal((u["games/ABC123/awayNumbers"] as number[]).length, 5);
    const r = u["games/ABC123/autoManageResult"] as { resizedFrom: number; resizedTo: number };
    assert.deepEqual([r.resizedFrom, r.resizedTo], [100, 25]);
  });

  it("never shrinks a full board or a board with numbers already drawn", () => {
    const full = planAutoManage("ABC123", board(100, { autoManage: { enabled: true, resize: true } }), game(), AT)!;
    assert.equal(full["games/ABC123/boardSize"], undefined);
    const drawn = planAutoManage("ABC123", board(20, { isRandomized: true, homeNumbers: [0], autoManage: { enabled: true, resize: true } }), game(), AT)!;
    assert.equal(drawn["games/ABC123/boardSize"], undefined);
    assert.equal(drawn["games/ABC123/homeNumbers"], undefined);
    assert.equal(drawn["games/ABC123/isLocked"], true);
  });

  it("leaves an empty board open and says so", () => {
    const u = planAutoManage("ABC123", board(0), game(), AT)!;
    assert.equal(u["games/ABC123/isLocked"], undefined);
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "skipped");
  });

  it("skips a board that is already locked and drawn", () => {
    const u = planAutoManage("ABC123", board(40, { isLocked: true, isRandomized: true }), game(), AT)!;
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "skipped");
    assert.equal(Object.keys(u).length, 1);
  });

  it("changes nothing if the game already started", () => {
    const u = planAutoManage("ABC123", board(40), game({ status: "in" }), KICKOFF + 60_000)!;
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "missed");
    assert.equal(u["games/ABC123/isLocked"], undefined);
  });

  it("ignores a game with no usable start time", () => {
    assert.equal(planAutoManage("ABC123", board(40), game({ date: "" }), AT), null);
  });

  it("still locks when the clock says kickoff has passed but ESPN still says pre", () => {
    const u = planAutoManage("ABC123", board(40), game(), KICKOFF + 60_000)!;
    assert.equal(u["games/ABC123/isLocked"], true);
  });
});

describe("helpers", () => {
  it("picks the smallest board that fits", () => {
    assert.equal(smallestFit(100, 25), 25);
    assert.equal(smallestFit(100, 26), 50);
    assert.equal(smallestFit(100, 51), null);
    assert.equal(smallestFit(50, 25), 25);
    assert.equal(smallestFit(25, 5), null);
  });

  it("reshuffles into unique cells and refuses when the picks do not fit", () => {
    const picks = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`0-${i}`, `P${i % 3}`]));
    const out = reshuffleSquares(picks, 5, 5)!;
    assert.equal(new Set(Object.keys(out)).size, 25);
    assert.equal(reshuffleSquares(picks, 4, 5), null);
  });

  it("draws every digit once", () => {
    assert.deepEqual(drawLine(10).sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(drawLine(5).sort(), [0, 1, 2, 3, 4]);
  });
});
