import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { PreviewFields, previewTeams, PreviewTheme, TeamLook } from "./preview-card";
import { El, PREVIEW_HEIGHT, PREVIEW_WIDTH, previewTree } from "./preview-layout";
import { FetchJson, teamLooks } from "./preview-teams";

type FetchBytes = (url: string) => Promise<{ type: string; bytes: Buffer } | null>;

const FONT_DIR = join(__dirname, "..", "fonts");
const MAX_LOGO_BYTES = 300_000;
const TIMEOUT_MS = 2500;
let fonts: Parameters<typeof satori>[1]["fonts"] | null = null;

/** The PNG for one board. A logo that can't be fetched is left out and the row shows the code alone. */
export async function renderPreviewPng(fields: PreviewFields, theme: PreviewTheme, net = { fetchJson, fetchBytes }): Promise<Buffer> {
  const looks = await teamLooks(fields, net.fetchJson);
  const [away, home] = await Promise.all([looks.away, looks.home].map(look => inlineLogo(look, net.fetchBytes)));
  return renderTreePng(previewTree(fields, previewTeams(fields, away, home), theme));
}

async function renderTreePng(tree: El): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: PREVIEW_WIDTH } }).render().asPng();
}

/** The logo as a data URI, since the renderer must not reach the network itself. */
async function inlineLogo(look: TeamLook | null, fetchBytes: FetchBytes): Promise<TeamLook | null> {
  if (!look?.logo) return look;
  const image = await fetchBytes(look.logo).catch(() => null);
  const logo = image && /^image\/(png|jpeg)$/.test(image.type) ? `data:${image.type};base64,${image.bytes.toString("base64")}` : null;
  return { ...look, logo };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return response.ok ? response.json() : null;
}

async function fetchBytes(url: string): Promise<{ type: string; bytes: Buffer } | null> {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > MAX_LOGO_BYTES) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length <= MAX_LOGO_BYTES ? { type: (response.headers.get("content-type") ?? "").split(";")[0], bytes } : null;
}

function loadFonts(): NonNullable<typeof fonts> {
  fonts ??= [
    { name: "Space Grotesk", weight: 400, style: "normal", data: readFileSync(join(FONT_DIR, "space-grotesk-latin-400-normal.ttf")) },
    { name: "Space Grotesk", weight: 600, style: "normal", data: readFileSync(join(FONT_DIR, "space-grotesk-latin-600-normal.ttf")) },
    { name: "JetBrains Mono", weight: 500, style: "normal", data: readFileSync(join(FONT_DIR, "jetbrains-mono-latin-500-normal.ttf")) },
  ];
  return fonts;
}

