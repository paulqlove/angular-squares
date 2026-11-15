import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cellColor, gridLineColor, isGameId, mix, PreviewFields, previewFields, previewState, previewTeams, previewTheme, previewVersion } from "./preview-card";

const fields = (overrides: Partial<PreviewFields> = {}): PreviewFields => ({
  name: "DUKE @ MIA squares", boardSize: 100, squaresFilled: 3, isLocked: false,
  awayTeam: "DUKE", homeTeam: "MIA", espnSport: "ncaaf", espnEventId: "401", ...overrides,
});

describe("previewFields", () => {
  it("counts picked squares without keeping player names", () => {
    const out = previewFields({ name: " Office pool ", boardSize: 50, selectedSquares: { "0-0": "Ann", "1-2": "Bo" }, isLocked: true });
    assert.deepEqual(out, { name: "Office pool", boardSize: 50, squaresFilled: 2, isLocked: true, awayTeam: "", homeTeam: "", espnSport: "nfl", espnEventId: "" });
    assert.ok(!JSON.stringify(out).includes("Ann"));
  });
  it("counts the squares map the app writes, and the old selectedSquares one", () => {
    assert.equal(previewFields({ name: "x", squares: { "0-0": "Ann", "0-1": "Ann", "4-4": "Bo" } })?.squaresFilled, 3);
    assert.equal(previewFields({ name: "x", selectedSquares: { "0-0": "Ann" } })?.squaresFilled, 1);
  });
  it("is null for a board that doesn't exist and treats odd sizes as 100", () => {
    assert.equal(previewFields({ name: null }), null);
    assert.equal(previewFields({ name: "x", boardSize: 64 })?.boardSize, 100);
  });
});

describe("previewState", () => {
  it("is locked before full, full at zero open, filling otherwise", () => {
    assert.equal(previewState(fields({ isLocked: true, squaresFilled: 100 })), "locked");
    assert.equal(previewState(fields({ boardSize: 25, squaresFilled: 25 })), "full");
    assert.equal(previewState(fields()), "filling");
  });
});

describe("previewVersion", () => {
  it("changes with the open count and state, not with ESPN ids", () => {
    const base = previewVersion(fields());
    assert.match(base, /^[a-f0-9]{10}$/);
    assert.notEqual(previewVersion(fields({ squaresFilled: 4 })), base);
    assert.notEqual(previewVersion(fields({ isLocked: true })), base);
    assert.equal(previewVersion(fields({ espnEventId: "999" })), base);
  });
});

describe("previewTeams", () => {
  it("matches the dashboard card: code with ESPN look, code alone, or free text", () => {
    const look = { name: "Blue Devils", logo: "data:image/png;base64,AA" };
    assert.deepEqual(previewTeams(fields(), look, null), [
      { code: "DUKE", name: "Blue Devils", logo: look.logo },
      { code: "MIA", name: "", logo: null },
    ]);
    assert.deepEqual(previewTeams(fields({ awayTeam: "Uncle Bob" }), null, null)?.[0], { code: "", name: "Uncle Bob", logo: null });
    assert.equal(previewTeams(fields({ homeTeam: "" }), null, null), null);
  });
});

describe("colours", () => {
  it("works out color-mix the way the browser does", () => {
    assert.equal(mix("#f3efe8", "#0f172a", 20), "#3d4250");
    assert.equal(gridLineColor("light"), mix("#f3efe8", "#0f172a", 10));
  });
  it("greens only open squares while filling, and blanks them once quiet", () => {
    assert.equal(cellColor(2, fields(), "light"), mix("#f3efe8", "#0f172a", 20));
    assert.equal(cellColor(3, fields(), "light"), "#2f9a70");
    assert.equal(cellColor(3, fields({ isLocked: true }), "dark"), "#020617");
    assert.equal(cellColor(2, fields({ isLocked: true }), "dark"), mix("#f3efe8", "#020617", 36));
  });
});

describe("inputs", () => {
  it("accepts board ids and join codes only, and dark only when asked", () => {
    assert.ok(isGameId("-NxAbc_123"));
    assert.ok(isGameId("K7QX2P"));
    assert.ok(!isGameId("../users"));
    assert.ok(!isGameId("a/b"));
    assert.equal(previewTheme("dark"), "dark");
    assert.equal(previewTheme("DARK"), "light");
    assert.equal(previewTheme(undefined), "light");
  });
});
