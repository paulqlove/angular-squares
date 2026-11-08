import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseScoreboard } from "./espn";
import { emptyScores, QuarterScores } from "./scoring";
import { groupLiveBoards, syncLiveScores } from "./sync";

function event(options: {
  id: string;
  statusName: string;
  completed?: boolean;
  period?: number;
  clock?: string;
  home?: number[];
  away?: number[];
  homeScore?: string;
  awayScore?: string;
}): unknown {
  const lines = (values: number[] = []) => values.map((value) => ({ value }));
  return {
    id: options.id,
    date: "2026-11-01T18:00Z",
    name: "SF at KC",
    status: {
      period: options.period ?? 1,
      displayClock: options.clock ?? "10:00",
      type: { name: options.statusName, completed: options.completed ?? false },
    },
    competitions: [{
      competitors: [
        {
          homeAway: "home",
          score: options.homeScore ?? "0",
          team: { abbreviation: "KC" },
          linescores: lines(options.home),
        },
        {
          homeAway: "away",
          score: options.awayScore ?? "0",
          team: { abbreviation: "SF" },
          linescores: lines(options.away),
        },
      ],
    }],
  };
}

describe("parseScoreboard", () => {
  it("maps in-progress, halftime, and final the same way as EspnService", () => {
    const games = parseScoreboard({
      events: [
        event({ id: "1", statusName: "STATUS_IN_PROGRESS", period: 2, clock: "5:22", home: [7, 7], away: [3, 7], homeScore: "14", awayScore: "10" }),
        event({ id: "2", statusName: "STATUS_HALFTIME", period: 2, clock: "0:00", home: [7], away: [3], homeScore: "7", awayScore: "3" }),
        event({ id: "3", statusName: "STATUS_FINAL", completed: true, period: 4, clock: "0:00", home: [7, 7, 7, 3], away: [0, 0, 0, 0], homeScore: "24", awayScore: "0" }),
        event({ id: "4", statusName: "STATUS_SCHEDULED" }),
      ],
    });

    assert.equal(games[0].status, "in");
    assert.equal(games[0].period, 2);
    assert.deepEqual(games[0].quarters[0], { home: 7, away: 3 });
    assert.deepEqual(games[0].quarters[1], { home: 7, away: 7 });
    assert.equal(games[0].quarters.length >= 4, true);
    assert.equal(games[1].status, "in");
    assert.equal(games[2].status, "post");
    assert.equal(games[2].completed, true);
    assert.equal(games[2].homeScore, 24);
    assert.equal(games[3].status, "pre");
  });

  it("returns nothing for an empty payload", () => {
    assert.deepEqual(parseScoreboard(null), []);
    assert.deepEqual(parseScoreboard({}), []);
  });
});

describe("syncLiveScores", () => {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  function stored(espnEventId: string, scores: QuarterScores = emptyScores()): unknown {
    return {
      espnEventId,
      squares: { "3-7": "Ada" },
      homeNumbers: numbers,
      awayNumbers: numbers,
      scores,
      winners: {},
    };
  }

  it("fetches each league once and applies that game to every linked board", async () => {
    const fetches: string[] = [];
    let written: Record<string, unknown> = {};
    const reads: string[] = [];

    const result = await syncLiveScores({
      readLiveGames: async () => ({
        "111": { BOARD1: { sport: "nfl" }, BOARD2: { sport: "nfl" } },
        "222": { BOARD3: { sport: "nba" } },
        "333": { BOARD4: { sport: "nfl" } },
      }),
      readGame: async (boardId) => {
        reads.push(boardId);
        if (boardId === "BOARD3") return stored("222");
        if (boardId === "BOARD4") return stored("999");
        return stored("111");
      },
      update: async (updates) => {
        written = updates;
      },
      fetchScoreboard: async (sport) => {
        fetches.push(sport);
        if (sport === "nba") {
          return [{
            id: "222",
            name: "BOS at NY",
            homeTeam: "NY",
            awayTeam: "BOS",
            homeScore: 2,
            awayScore: 0,
            period: 1,
            clock: "9:00",
            status: "in",
            completed: false,
            quarters: [{ home: 2, away: 0 }, { home: 0, away: 0 }, { home: 0, away: 0 }, { home: 0, away: 0 }],
            date: "",
          }];
        }
        return [{
          id: "111",
          name: "SF at KC",
          homeTeam: "KC",
          awayTeam: "SF",
          homeScore: 7,
          awayScore: 3,
          period: 2,
          clock: "10:00",
          status: "in",
          completed: false,
          quarters: [
            { home: 7, away: 3 },
            { home: 0, away: 0 },
            { home: 0, away: 0 },
            { home: 0, away: 0 },
          ],
          date: "",
        }];
      },
    });

    assert.deepEqual(fetches.sort(), ["nba", "nfl"]);
    assert.deepEqual(reads.sort(), ["BOARD1", "BOARD2", "BOARD3", "BOARD4"]);
    assert.equal(result.leagues, 2);
    assert.equal(result.boardsWritten, 3);
    assert.ok(written["games/BOARD1/scores"]);
    assert.ok(written["games/BOARD2/scores"]);
    assert.deepEqual(written["games/BOARD1/winners"], { q1: "Ada" });
    assert.equal(written["games/BOARD1/espnLive"] && (written["games/BOARD1/espnLive"] as { clock: string }).clock, "10:00");
    assert.equal(written["liveGames/333/BOARD4"], null);
    assert.equal(written["games/BOARD4/scores"], undefined);
    assert.equal(result.finalized, 0);
  });

  it("does not fetch ESPN when nothing is linked", async () => {
    let fetched = false;
    const result = await syncLiveScores({
      readLiveGames: async () => null,
      readGame: async () => null,
      update: async () => {
        throw new Error("should not write");
      },
      fetchScoreboard: async () => {
        fetched = true;
        return [];
      },
    });
    assert.equal(fetched, false);
    assert.equal(result.boardsConsidered, 0);
  });

  it("removes a final game from the index and skips a game that is not on the scoreboard", async () => {
    let written: Record<string, unknown> = {};
    await syncLiveScores({
      readLiveGames: async () => ({
        "111": { BOARD1: { sport: "nfl" } },
        "444": { BOARD2: { sport: "nfl" } },
      }),
      readGame: async (boardId) => stored(boardId === "BOARD1" ? "111" : "444"),
      update: async (updates) => {
        written = updates;
      },
      fetchScoreboard: async () => [{
        id: "111",
        name: "SF at KC",
        homeTeam: "KC",
        awayTeam: "SF",
        homeScore: 24,
        awayScore: 0,
        period: 4,
        clock: "0:00",
        status: "post",
        completed: true,
        quarters: [
          { home: 7, away: 0 },
          { home: 7, away: 0 },
          { home: 7, away: 0 },
          { home: 3, away: 0 },
        ],
        date: "",
      }],
    });

    assert.equal(written["liveGames/111/BOARD1"], null);
    assert.ok(written["games/BOARD1/scores"]);
    assert.equal((written["games/BOARD1/scores"] as QuarterScores).q4.home, 24);
    assert.equal(written["games/BOARD2/scores"], undefined);
    assert.equal(written["liveGames/444/BOARD2"], undefined);
  });

  it("ignores index rows with an unknown sport or a bad id", () => {
    assert.deepEqual(groupLiveBoards({
      "12": { GOODID: { sport: "curling" }, "../x": { sport: "nfl" } },
      "bad/id": { GOODID: { sport: "nfl" } },
    }), []);
  });
});
