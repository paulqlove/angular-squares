import { isSportType, SCOREBOARD_URLS } from "./espn";
import { PreviewFields, TEAM_CODE, TeamLook } from "./preview-card";

export type FetchJson = (url: string) => Promise<unknown>;

/** ESPN's code for an NFL team where ours differs. */
const ESPN_NFL_CODES: Record<string, string> = { WAS: "wsh" };
const ESPN_IMAGE_HOST = /^https:\/\/a\.espncdn\.com\//;

/**
 * Logo and nickname for both teams, like TeamLogoService in the app: NFL teams by code,
 * other leagues from the linked ESPN game. A failed or missing lookup leaves that side null (code only).
 */
export async function teamLooks(fields: PreviewFields, fetchJson: FetchJson): Promise<{ away: TeamLook | null; home: TeamLook | null }> {
  const base = leagueBase(fields.espnSport);
  if (!base) return { away: null, home: null };
  if (fields.espnSport === "nfl") {
    const [away, home] = await Promise.all([fields.awayTeam, fields.homeTeam].map(code => nflTeam(base, code, fetchJson)));
    return { away, home };
  }
  if (!fields.espnEventId) return { away: null, home: null };
  const summary = await fetchJson(`${base}/summary?event=${encodeURIComponent(fields.espnEventId)}`).catch(() => null);
  return { away: summaryTeam(summary, fields.awayTeam), home: summaryTeam(summary, fields.homeTeam) };
}

/** Nickname and logo from an ESPN team object; a logo off ESPN's image host is dropped. */
export function lookFromTeam(team: unknown): TeamLook | null {
  if (!team || typeof team !== "object") return null;
  const record = team as { name?: unknown; logo?: unknown; logos?: Array<{ href?: unknown }> };
  const href = typeof record.logo === "string" ? record.logo : record.logos?.[0]?.href;
  const logo = typeof href === "string" && ESPN_IMAGE_HOST.test(href) ? href : null;
  const name = typeof record.name === "string" && record.name ? record.name : null;
  return name || logo ? { name, logo } : null;
}

/** The competitor whose code matches, from an ESPN event summary. */
export function summaryTeam(summary: unknown, code: string): TeamLook | null {
  const competitions = (summary as { header?: { competitions?: Array<{ competitors?: unknown[] }> } } | null)?.header?.competitions;
  const competitors = competitions?.[0]?.competitors ?? [];
  const match = competitors.find(c => {
    const abbreviation = (c as { team?: { abbreviation?: unknown } })?.team?.abbreviation;
    return typeof abbreviation === "string" && abbreviation.toUpperCase() === code.toUpperCase();
  });
  return lookFromTeam((match as { team?: unknown } | undefined)?.team);
}

function leagueBase(sport: string): string | null {
  return isSportType(sport) ? SCOREBOARD_URLS[sport].replace(/\/scoreboard$/, "") : null;
}

async function nflTeam(base: string, code: string, fetchJson: FetchJson): Promise<TeamLook | null> {
  if (!TEAM_CODE.test(code)) return null;
  const espnCode = ESPN_NFL_CODES[code] ?? code.toLowerCase();
  const data = await fetchJson(`${base}/teams/${encodeURIComponent(espnCode)}`).catch(() => null);
  return lookFromTeam((data as { team?: unknown } | null)?.team);
}
