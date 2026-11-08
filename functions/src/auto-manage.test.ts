import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTO_MANAGE_GRACE_MS, AUTO_MANAGE_LEAD_MS, drawLine, planAutoManage, reshuffleSquares, smallestFit } from "./auto-manage";
import { runDueAutoManage } from "./auto-manage-run";

const KICKOFF = Date.parse("2026-11-08T18:00:00Z");
const RUN_AT = KICKOFF - AUTO_MANAGE_LEAD_MS;
const AT = RUN_AT + 1000;

function settings(resize = false, enabled = true): Record<string, unknown> {
  return { enabled, resize, runAt: RUN_AT };
}

function board(picks: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const squares: Record<string, string> = {};
  for (let i = 0; i < picks; i++) squares[`${Math.floor(i / 10)}-${i % 10}`] = i % 2 ? "Ann" : "Bo";
  return { boardSize: 100, squares, isLocked: false, isRandomized: false, autoManage: settings(), ...extra };
}

describe("planAutoManage", () => {
  it("does nothing before the run time", () => {
    assert.equal(planAutoManage("ABC123", board(40), RUN_AT - 1), null);
  });

  it("does nothing when the switch is off, has no run time, or it already ran", () => {
    assert.equal(planAutoManage("ABC123", board(40, { autoManage: settings(false, false) }), AT), null);
    assert.equal(planAutoManage("ABC123", board(40, { autoManage: { enabled: true, resize: true } }), AT), null);
    assert.equal(planAutoManage("ABC123", board(40, { autoManageResult: { state: "done" } }), AT), null);
    assert.equal(planAutoManage("ABC123", { ...board(40), autoManage: undefined }, AT), null);
  });

  it("locks and draws a valid 10x10 board without resizing", () => {
    const u = planAutoManage("ABC123", board(40), AT)!;
    assert.equal(u["games/ABC123/isLocked"], true);
    assert.equal(u["games/ABC123/isRandomized"], true);
    assert.equal(u["games/ABC123/boardSize"], undefined);
    assert.deepEqual([...(u["games/ABC123/homeNumbers"] as number[])].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual([...(u["games/ABC123/awayNumbers"] as number[])].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "done");
  });

  it("shrinks a half-empty board only when resize is on, keeping every pick", () => {
    const off = planAutoManage("ABC123", board(40), AT)!;
    assert.equal(off["games/ABC123/boardSize"], undefined);

    const u = planAutoManage("ABC123", board(40, { autoManage: settings(true) }), AT)!;
    assert.equal(u["games/ABC123/boardSize"], 50);
    const squares = u["games/ABC123/squares"] as Record<string, string>;
    assert.equal(Object.keys(squares).length, 40);
    assert.equal(Object.values(squares).filter((n) => n === "Ann").length, 20);
    for (const key of Object.keys(squares)) {
      const [r, c] = key.split("-").map(Number);
      assert.ok(r < 5 && c < 10, key);
    }
    assert.equal((u["games/ABC123/homeNumbers"] as number[]).length, 10);
    assert.deepEqual([...(u["games/ABC123/awayNumbers"] as number[])].sort(), [0, 1, 2, 3, 4]);
  });

  it("goes to 25 when 25 or fewer picks, and draws five groups on both sides", () => {
    const u = planAutoManage("ABC123", board(20, { autoManage: settings(true) }), AT)!;
    assert.equal(u["games/ABC123/boardSize"], 25);
    assert.equal((u["games/ABC123/homeNumbers"] as number[]).length, 5);
    const r = u["games/ABC123/autoManageResult"] as { resizedFrom: number; resizedTo: number };
    assert.deepEqual([r.resizedFrom, r.resizedTo], [100, 25]);
  });

  it("never shrinks a full board or a board with numbers already drawn", () => {
    const full = planAutoManage("ABC123", board(100, { autoManage: settings(true) }), AT)!;
    assert.equal(full["games/ABC123/boardSize"], undefined);
    const drawn = planAutoManage("ABC123", board(20, { isRandomized: true, autoManage: settings(true) }), AT)!;
    assert.equal(drawn["games/ABC123/boardSize"], undefined);
    assert.equal(drawn["games/ABC123/homeNumbers"], undefined);
    assert.equal(drawn["games/ABC123/isLocked"], true);
  });

  it("leaves an empty board open and says so", () => {
    const u = planAutoManage("ABC123", board(0), AT)!;
    assert.equal(u["games/ABC123/isLocked"], undefined);
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "skipped");
  });

  it("skips a board that is already locked and drawn", () => {
    const u = planAutoManage("ABC123", board(40, { isLocked: true, isRandomized: true }), AT)!;
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "skipped");
    assert.equal(Object.keys(u).length, 1);
  });

  it("changes nothing after a long outage (game already started)", () => {
    const u = planAutoManage("ABC123", board(40), RUN_AT + AUTO_MANAGE_GRACE_MS + 1)!;
    assert.equal((u["games/ABC123/autoManageResult"] as { state: string }).state, "missed");
    assert.equal(u["games/ABC123/isLocked"], undefined);
  });
});

describe("runDueAutoManage", () => {
  it("runs a due board once, then drops it from the queue", async () => {
    let stored = board(20, { autoManage: settings(true) });
    const writes: Record<string, unknown>[] = [];
    const deps = {
      readDue: async () => ({ ABC123: RUN_AT }),
      readGame: async () => stored,
      update: async (u: Record<string, unknown>) => {
        writes.push(u);
        stored = { ...stored, autoManageResult: u["games/ABC123/autoManageResult"] };
      },
      now: () => AT,
    };
    const first = await runDueAutoManage(deps);
    assert.deepEqual(first, { due: 1, ran: 1 });
    assert.equal(writes[0]["games/ABC123/isLocked"], true);
    assert.equal(writes[0]["autoManageQueue/ABC123"], null);

    const second = await runDueAutoManage(deps);
    assert.equal(second.ran, 0);
  });

  it("drops a queue row for a board that was switched off or deleted, and ignores bad ids", async () => {
    const writes: Record<string, unknown>[] = [];
    const games: Record<string, unknown> = { OFF123: board(20, { autoManage: undefined }), ON1234: null };
    const result = await runDueAutoManage({
      readDue: async () => ({ OFF123: RUN_AT, GONE12: RUN_AT, "../x": RUN_AT }),
      readGame: async (id) => games[id] ?? null,
      update: async (u) => { writes.push(u); },
      now: () => AT,
    });
    assert.deepEqual(result, { due: 2, ran: 0 });
    assert.equal(writes[0]["autoManageQueue/OFF123"], null);
    assert.equal(writes[0]["autoManageQueue/GONE12"], null);
    assert.equal(Object.keys(writes[0]).length, 2);
  });

  it("does nothing when nothing is due", async () => {
    let called = false;
    const result = await runDueAutoManage({ readDue: async () => null, readGame: async () => null, update: async () => { called = true; }, now: () => AT });
    assert.deepEqual(result, { due: 0, ran: 0 });
    assert.equal(called, false);
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
