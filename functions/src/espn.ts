import { GameStatus, ParsedEspnGame, QuarterScore } from "./scoring";

export type SportType = "nfl" | "nba" | "ncaaf" | "wnba" | "afl";

export const SPORT_TYPES: readonly SportType[] = ["nfl", "nba", "ncaaf", "wnba", "afl"];

export const SPORT_PERIODS: Record<SportType, number> = {
  nfl: 4,
  nba: 4,
  ncaaf: 4,
  wnba: 4,
  afl: 4,
};

/** One scoreboard request per league. Same endpoints as EspnService. */
export const SCOREBOARD_URLS: Record<SportType, string> = {
  nfl: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  nba: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  ncaaf: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
  wnba: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
  afl: "https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/scoreboard",
};

export function isSportType(value: string): value is SportType {
  return (SPORT_TYPES as readonly string[]).includes(value);
}

export function parseScoreboard(data: unknown, sport: SportType = "nfl"): ParsedEspnGame[] {
  if (!data || typeof data !== "object") return [];
  const events = (data as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];

  const periodCount = SPORT_PERIODS[sport];
  const games: ParsedEspnGame[] = [];

  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const record = event as Record<string, unknown>;
    const competitions = Array.isArray(record["competitions"]) ? record["competitions"] : [];
    const competition = competitions[0] && typeof competitions[0] === "object"
      ? (competitions[0] as Record<string, unknown>)
      : undefined;
    const competitors = Array.isArray(competition?.["competitors"])
      ? (competition?.["competitors"] as unknown[])
      : [];
    const home = competitor(competitors, "home");
    const away = competitor(competitors, "away");
    const status = record["status"] && typeof record["status"] === "object"
      ? (record["status"] as Record<string, unknown>)
      : undefined;
    const statusType = status?.["type"] && typeof status["type"] === "object"
      ? (status["type"] as Record<string, unknown>)
      : undefined;

    const homeLines = linescores(home);
    const awayLines = linescores(away);
    const maxPeriods = Math.max(homeLines.length, awayLines.length, periodCount);
    const quarters: QuarterScore[] = [];
    for (let i = 0; i < maxPeriods; i++) {
      quarters.push({
        home: homeLines[i]?.value || 0,
        away: awayLines[i]?.value || 0,
      });
    }

    const statusName = typeof statusType?.["name"] === "string" ? statusType["name"] : "";
    const completed = !!statusType?.["completed"];
    let gameStatus: GameStatus = "pre";
    if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_HALFTIME") {
      gameStatus = "in";
    } else if (statusName === "STATUS_FINAL" || completed) {
      gameStatus = "post";
    }

    const id = record["id"] != null ? String(record["id"]) : "";
    if (!id) continue;

    const homeAbbr = teamLabel(home, "Home");
    const awayAbbr = teamLabel(away, "Away");
    games.push({
      id,
      name: typeof record["name"] === "string" && record["name"]
        ? record["name"]
        : `${awayAbbr} at ${homeAbbr}`,
      homeTeam: homeAbbr,
      awayTeam: awayAbbr,
      homeScore: parseInt(scoreText(home), 10) || 0,
      awayScore: parseInt(scoreText(away), 10) || 0,
      period: typeof status?.["period"] === "number" ? status["period"] : 0,
      clock: typeof status?.["displayClock"] === "string" ? status["displayClock"] : "",
      status: gameStatus,
      completed,
      quarters,
      date: typeof record["date"] === "string" ? record["date"] : "",
    });
  }

  return games;
}

export async function fetchScoreboard(
  sport: SportType,
  fetchImpl: typeof fetch = fetch
): Promise<ParsedEspnGame[]> {
  const response = await fetchImpl(SCOREBOARD_URLS[sport], {
    headers: {
      Accept: "application/json",
      "User-Agent": "quarterscore-scores/1.0 (+https://quarterscore.com)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`ESPN ${sport} scoreboard HTTP ${response.status}`);
  }
  return parseScoreboard(await response.json(), sport);
}

function competitor(competitors: unknown[], homeAway: "home" | "away"): Record<string, unknown> | undefined {
  const match = competitors.find((entry) => {
    return !!entry && typeof entry === "object" && (entry as Record<string, unknown>)["homeAway"] === homeAway;
  });
  return match && typeof match === "object" ? (match as Record<string, unknown>) : undefined;
}

function linescores(competitorRow: Record<string, unknown> | undefined): { value?: number }[] {
  const raw = competitorRow?.["linescores"];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (!entry || typeof entry !== "object") return {};
    const value = (entry as Record<string, unknown>)["value"];
    return typeof value === "number" ? { value } : {};
  });
}

function teamLabel(competitorRow: Record<string, unknown> | undefined, fallback: string): string {
  const team = competitorRow?.["team"];
  if (!team || typeof team !== "object") return fallback;
  const record = team as Record<string, unknown>;
  if (typeof record["abbreviation"] === "string" && record["abbreviation"]) return record["abbreviation"];
  if (typeof record["shortDisplayName"] === "string" && record["shortDisplayName"]) return record["shortDisplayName"];
  return fallback;
}

function scoreText(competitorRow: Record<string, unknown> | undefined): string {
  const score = competitorRow?.["score"];
  if (typeof score === "string") return score;
  if (typeof score === "number") return String(score);
  return "0";
}
