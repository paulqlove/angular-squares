import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PreviewFields } from "./preview-card";
import { lookFromTeam, summaryTeam, teamLooks } from "./preview-teams";

const fields = (overrides: Partial<PreviewFields> = {}): PreviewFields => ({
  name: "x", boardSize: 100, squaresFilled: 0, isLocked: false,
  awayTeam: "DUKE", homeTeam: "MIA", espnSport: "ncaaf", espnEventId: "401", ...overrides,
});
const team = (abbreviation: string, name: string) => ({ abbreviation, name, logos: [{ href: `https://a.espncdn.com/i/teamlogos/${abbreviation}.png` }] });

describe("lookFromTeam", () => {
  it("keeps ESPN-hosted logos only", () => {
    assert.deepEqual(lookFromTeam({ name: "Eagles", logo: "https://evil.example/x.png" }), { name: "Eagles", logo: null });
    assert.equal(lookFromTeam({}), null);
    assert.equal(lookFromTeam("nope"), null);
  });
});

describe("summaryTeam", () => {
  it("finds the competitor by code", () => {
    const summary = { header: { competitions: [{ competitors: [{ team: team("DUKE", "Blue Devils") }, { team: team("MIA", "Hurricanes") }] }] } };
    assert.equal(summaryTeam(summary, "mia")?.name, "Hurricanes");
    assert.equal(summaryTeam(summary, "UNC"), null);
    assert.equal(summaryTeam(null, "MIA"), null);
  });
});

describe("teamLooks", () => {
  it("asks for the linked game once for other leagues", async () => {
    const urls: string[] = [];
    const looks = await teamLooks(fields(), async url => {
      urls.push(url);
      return { header: { competitions: [{ competitors: [{ team: team("DUKE", "Blue Devils") }, { team: team("MIA", "Hurricanes") }] }] } };
    });
    assert.deepEqual(urls, ["https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=401"]);
    assert.equal(looks.away?.name, "Blue Devils");
    assert.equal(looks.home?.name, "Hurricanes");
  });
  it("looks NFL teams up by code, using ESPN's code for Washington", async () => {
    const urls: string[] = [];
    const looks = await teamLooks(fields({ espnSport: "nfl", awayTeam: "WAS", homeTeam: "DAL" }), async url => {
      urls.push(url);
      return { team: team("X", url.endsWith("dal") ? "Cowboys" : "Commanders") };
    });
    assert.deepEqual(urls.map(u => u.split("/").pop()), ["wsh", "dal"]);
    assert.equal(looks.home?.name, "Cowboys");
  });
  it("leaves both sides empty when there is nothing to ask or ESPN fails", async () => {
    const fail = async () => { throw new Error("down"); };
    assert.deepEqual(await teamLooks(fields({ espnEventId: "" }), fail), { away: null, home: null });
    assert.deepEqual(await teamLooks(fields(), fail), { away: null, home: null });
    assert.deepEqual(await teamLooks(fields({ espnSport: "nfl", awayTeam: "Uncle Bob", homeTeam: "DAL" }), fail), { away: null, home: null });
    assert.deepEqual(await teamLooks(fields({ espnSport: "cricket" }), fail), { away: null, home: null });
  });
});
