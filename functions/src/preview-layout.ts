import {
  cellColor,
  gridLineColor,
  openCount,
  PREVIEW_TOKENS,
  PreviewFields,
  previewState,
  PreviewTeam,
  PreviewTheme,
  TILE_COUNT,
  TILE_INK,
  TILE_MUTED,
} from "./preview-card";

/** A satori node: the same shape React elements have, without React. */
export interface El {
  type: string;
  props: { style?: Record<string, string | number>; children?: El | El[] | string; src?: string; width?: number; height?: number };
}

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

/** Creative's spec: the Grid card laid out 552px wide and drawn at 2x (engineering/share-preview/README.md). */
const S = 2;
const px = (n: number): number => n * S;
const SANS = "Space Grotesk";
const MONO = "JetBrains Mono";
const MARK = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#34d399" d="M9 2H13A1 1 0 0 1 14 3V7H9V2Z"/><path fill="#ffffff" fill-rule="evenodd" d="M3 0H13A3 3 0 0 1 16 3V13A3 3 0 0 1 13 16H3A3 3 0 0 1 0 13V3A3 3 0 0 1 3 0ZM3 2H7V7H2V3A1 1 0 0 1 3 2ZM9 2H13A1 1 0 0 1 14 3V7H9V2ZM9 9H14V13A1 1 0 0 1 13 14H9V9ZM2 9H7V14H3A1 1 0 0 1 2 13V9Z"/></svg>');
const LOCK = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${TILE_INK}" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>`);

/** The whole 1200x630 picture: the page background with the card on it. */
export function previewTree(fields: PreviewFields, teams: PreviewTeam[] | null, theme: PreviewTheme): El {
  const t = PREVIEW_TOKENS[theme];
  return box({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, alignItems: "center", justifyContent: "center", background: t.page, fontFamily: SANS }, [
    box({
      width: px(552), boxSizing: "border-box", flexDirection: "column", padding: px(12), paddingBottom: px(16), background: t.panel,
      border: `${px(1)}px solid ${t.line}`, borderRadius: px(10), boxShadow: `0 ${px(10)}px ${px(28)}px ${px(-22)}px ${t.shadow}`,
    }, [tile(fields, theme), title(fields.name, theme), teamRows(teams, theme)]),
  ]);
}

function tile(fields: PreviewFields, theme: PreviewTheme): El {
  return box({ position: "relative", alignItems: "flex-end", gap: px(18), padding: px(18), borderRadius: px(8), background: PREVIEW_TOKENS[theme].tile }, [
    miniBoard(fields, theme),
    tileState(fields),
    img(MARK, px(26), { position: "absolute", top: px(18), right: px(18) }),
  ]);
}

/** A square box so 25, 50 and 100-square boards take the same space; a 50 board sits at the bottom of it. */
function miniBoard(fields: PreviewFields, theme: PreviewTheme): El {
  const cols = fields.boardSize === 25 ? 5 : 10;
  const gap = 2;
  const cell = (222 - 4 - gap * (cols - 1)) / cols;
  const cells = Array.from({ length: fields.boardSize }, (_, i) =>
    box({ width: cell, height: cell, background: cellColor(i, fields, theme) }, []));
  return box({ width: 222, height: 222, alignItems: "flex-end" }, [
    box({ width: 222, flexWrap: "wrap", gap, padding: 2, borderRadius: 6, background: gridLineColor(theme) }, cells),
  ]);
}

function tileState(fields: PreviewFields): El {
  const state = previewState(fields);
  if (state === "locked") return box({ alignItems: "center", gap: px(8), paddingBottom: px(2) }, [img(LOCK, 36), label("Locked", TILE_INK)]);
  if (state === "full") return box({ paddingBottom: px(2) }, [label("Full", TILE_INK)]);
  return box({ flexDirection: "column", gap: px(6), paddingBottom: px(2) }, [
    text(String(openCount(fields)), { fontSize: px(40), fontWeight: 600, lineHeight: 0.9, letterSpacing: "-0.04em", color: TILE_COUNT }),
    label("open", TILE_COUNT),
    text(`of ${fields.boardSize}`, { fontSize: 32, color: TILE_MUTED }),
  ]);
}

function title(name: string, theme: PreviewTheme): El {
  return text(name, {
    marginTop: px(14), paddingLeft: px(6), paddingRight: px(6), fontSize: px(24), fontWeight: 600, lineHeight: 1.25,
    letterSpacing: "-0.01em", color: PREVIEW_TOKENS[theme].ink, ...ellipsis(),
  });
}

function teamRows(teams: PreviewTeam[] | null, theme: PreviewTheme): El {
  const t = PREVIEW_TOKENS[theme];
  if (!teams) return text("Teams not set", { marginTop: px(4), paddingLeft: px(6), fontSize: px(17), color: t.muted });
  return box({ flexDirection: "column", gap: px(4), marginTop: px(6), paddingLeft: px(6), paddingRight: px(6) }, teams.map(team =>
    box({ alignItems: "center", gap: px(8), height: px(24), fontSize: px(17) }, [
      ...(team.logo ? [img(team.logo, px(24))] : []),
      ...(team.code ? [text(team.code, { fontWeight: 600, color: t.ink, flexShrink: 0 })] : []),
      ...(team.name ? [text(team.name, { color: team.code ? t.muted : t.ink, ...ellipsis() })] : []),
    ])));
}

function label(value: string, color: string): El {
  return text(value.toUpperCase(), { fontFamily: MONO, fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: "0.1em", color });
}

function ellipsis(): Record<string, string | number> {
  return { display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 };
}

function box(style: Record<string, string | number>, children: El[]): El {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

function text(value: string, style: Record<string, string | number>): El {
  return { type: "div", props: { style, children: value } };
}

function img(src: string, size: number, style: Record<string, string | number> = {}): El {
  return { type: "img", props: { src, width: size, height: size, style: { flexShrink: 0, ...style } } };
}

function svgUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
