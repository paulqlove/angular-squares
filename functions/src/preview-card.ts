import { createHash } from "node:crypto";

/** The few fields of games/{id} a link preview needs. Nothing personal: player names are only counted. */
export interface PreviewFields {
  name: string;
  boardSize: 25 | 50 | 100;
  squaresFilled: number;
  isLocked: boolean;
  awayTeam: string;
  homeTeam: string;
  espnSport: string;
  espnEventId: string;
}

export type PreviewState = "filling" | "full" | "locked";
export type PreviewTheme = "light" | "dark";

/** One team as ESPN describes it: nickname and logo URL, either of which may be missing. */
export interface TeamLook {
  name: string | null;
  logo: string | null;
}

/** One team row on the card, the same rule as the dashboard card (src/app/core/utils/card-teams.ts). */
export interface PreviewTeam {
  code: string;
  name: string;
  logo: string | null;
}

/** The child paths readPreviewFields asks for, so a preview never downloads a whole board. Squares live under `squares`; old boards used `selectedSquares`. */
export const PREVIEW_PATHS = ["name", "boardSize", "isLocked", "awayTeam", "homeTeam", "espnSport", "espnEventId", "squares", "selectedSquares"] as const;

/** Card colours per theme: the dashboard card tokens in src/styles.scss, with color-mix worked out. */
export const PREVIEW_TOKENS = {
  light: { page: "#f6f3ee", panel: "#fffefc", line: "#e4dfd6", ink: "#0f172a", muted: "#5b6070", tile: "#0f172a", shadow: "rgba(15,23,42,.4)" },
  dark: { page: "#0f172a", panel: "#1e293b", line: "#334155", ink: "#f3efe8", muted: "#b4bfcc", tile: "#020617", shadow: "rgba(0,0,0,.8)" },
} as const;
export const TILE_INK = "#f3efe8";
export const TILE_MUTED = "#94a3b8";
export const TILE_OPEN = "#2f9a70";
export const TILE_COUNT = "#6fd3a0";

const GAME_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A short team code (DAL, DUKE) as opposed to a name the host typed. Same rule as the app's card-teams.ts. */
export const TEAM_CODE = /^[A-Z0-9&.]{2,5}$/;

/** Game ids are Firebase push keys or join codes; anything else never reaches the database. */
export function isGameId(value: string): boolean {
  return GAME_ID.test(value);
}

/** Only "dark" picks the dark card; anything else is light, the default. */
export function previewTheme(value: unknown): PreviewTheme {
  return value === "dark" ? "dark" : "light";
}

/** Shapes the raw child values into PreviewFields, or null when the board doesn't exist. */
export function previewFields(raw: Record<string, unknown>): PreviewFields | null {
  if (typeof raw["name"] !== "string") return null;
  const size = raw["boardSize"] === 25 || raw["boardSize"] === 50 ? raw["boardSize"] : 100;
  const squares = raw["squares"] ?? raw["selectedSquares"];
  const text = (key: string): string => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  return {
    name: raw["name"].trim(),
    boardSize: size,
    squaresFilled: squares && typeof squares === "object" ? Object.keys(squares).length : 0,
    isLocked: raw["isLocked"] === true,
    awayTeam: text("awayTeam"),
    homeTeam: text("homeTeam"),
    espnSport: text("espnSport") || "nfl",
    espnEventId: text("espnEventId"),
  };
}

export function openCount(fields: PreviewFields): number {
  return Math.max(0, fields.boardSize - fields.squaresFilled);
}

export function previewState(fields: PreviewFields): PreviewState {
  if (fields.isLocked) return "locked";
  return openCount(fields) === 0 ? "full" : "filling";
}

/**
 * A short key that changes whenever the picture would: name, teams, size, open count or state.
 * It goes in the og:image URL, so chat apps that cache per URL fetch a new picture once the board changes.
 */
export function previewVersion(fields: PreviewFields): string {
  const parts = [fields.name, fields.awayTeam, fields.homeTeam, fields.boardSize, openCount(fields), previewState(fields)];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 10);
}

/** The path of a board's current picture, /og/game/{id}/{theme}-{version}.png. */
export function previewImagePath(gameId: string, theme: PreviewTheme, fields: PreviewFields): string {
  return `/og/game/${gameId}/${theme}-${previewVersion(fields)}.png`;
}

/** The card's team rows, away first, or null for "Teams not set". Mirrors cardTeam in src/app/core/utils/card-teams.ts. */
export function previewTeams(fields: PreviewFields, away: TeamLook | null, home: TeamLook | null): PreviewTeam[] | null {
  if (!fields.awayTeam || !fields.homeTeam) return null;
  return [previewTeam(fields.awayTeam, away), previewTeam(fields.homeTeam, home)];
}

/** One mini-board square: claimed squares fill from the top, as on the dashboard card (src/app/core/utils/mini-grid.ts). */
export function cellColor(index: number, fields: PreviewFields, theme: PreviewTheme): string {
  const tile = PREVIEW_TOKENS[theme].tile;
  const taken = index < fields.squaresFilled;
  if (previewState(fields) !== "filling") return taken ? mix(TILE_INK, tile, 36) : tile;
  return taken ? mix(TILE_INK, tile, 20) : TILE_OPEN;
}

/** The hairlines between mini-board squares. */
export function gridLineColor(theme: PreviewTheme): string {
  return mix(TILE_INK, PREVIEW_TOKENS[theme].tile, 10);
}

/** CSS color-mix(in srgb, a pct%, b) for two #rrggbb colours. */
export function mix(a: string, b: string, pct: number): string {
  const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map(i => Math.round((channel(a, i) * pct + channel(b, i) * (100 - pct)) / 100));
  return `#${out.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function previewTeam(value: string, look: TeamLook | null): PreviewTeam {
  if (!TEAM_CODE.test(value)) return { code: "", name: value, logo: null };
  return { code: value, name: look?.name ?? "", logo: look?.logo ?? null };
}
