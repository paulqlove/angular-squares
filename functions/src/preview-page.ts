import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { escapeHtml } from "./html";
import { isGameId, openCount, PreviewFields, previewImagePath, previewState, previewTheme } from "./preview-card";
import type { ReadPreview } from "./preview-http";

export interface PageDeps {
  readPreview: ReadPreview;
  fetchShell: (origin: string) => Promise<string>;
  log: (message: string, details: object) => void;
}

/** Hosts whose own game.html may be fetched: the live site and its Firebase preview channels. Anything else gets the live site. */
const HOSTS = /^(?:(?:www\.)?quarterscore\.com|squares-4e4f7(?:--[a-z0-9-]+)?\.(?:web\.app|firebaseapp\.com))$/;
const LIVE_ORIGIN = "https://quarterscore.com";

/** The board id from /game/{id}, or null. */
export function gameIdFromPath(path: string): string | null {
  const id = /^\/game\/([^/]+)\/?$/.exec(path)?.[1] ?? null;
  return id && isGameId(id) ? id : null;
}

/** The origin to fetch game.html from and to put in the image URL, so a preview channel previews itself. */
export function siteOrigin(host: string | undefined): string {
  const name = (host ?? "").split(",")[0].trim().toLowerCase();
  return HOSTS.test(name) ? `https://${name}` : LIVE_ORIGIN;
}

/** Puts the board's own title and picture into the game.html shell's Open Graph and Twitter tags. */
export function injectPreviewTags(shell: string, fields: PreviewFields, image: string): string {
  const values: Record<string, string> = {
    'property="og:title"': fields.name,
    'name="twitter:title"': fields.name,
    'property="og:image"': image,
    'name="twitter:image"': image,
    'property="og:image:alt"': imageAlt(fields),
    'name="twitter:image:alt"': imageAlt(fields),
  };
  return Object.entries(values).reduce(
    (html, [attribute, value]) => html.replace(new RegExp(`(<meta ${attribute} content=")[^"]*"`), (_, start: string) => `${start}${escapeHtml(value)}"`),
    shell
  );
}

/** What the picture shows, for screen readers in chat apps. */
export function imageAlt(fields: PreviewFields): string {
  const state = previewState(fields);
  if (state === "locked") return `${fields.name}: board locked`;
  if (state === "full") return `${fields.name}: all ${fields.boardSize} squares taken`;
  return `${fields.name}: ${openCount(fields)} of ${fields.boardSize} squares open`;
}

/**
 * Serves /game/{id}: Hosting's own game.html, with this board's preview tags when the board exists.
 * The theme comes from the share link (?theme=dark); light otherwise.
 */
export async function serveGamePage(req: Request, res: Response, deps: PageDeps): Promise<void> {
  const origin = siteOrigin(req.get("x-forwarded-host") ?? req.hostname);
  const gameId = gameIdFromPath(req.path);
  const [shell, fields] = await Promise.all([
    deps.fetchShell(origin).catch(() => null),
    gameId ? deps.readPreview(gameId).catch(error => {
      deps.log("game preview read failed", { gameId, error: String(error) });
      return null;
    }) : null,
  ]);
  if (!shell) {
    deps.log("game shell fetch failed", { origin });
    res.status(502).set("Cache-Control", "no-store").send("The game page didn't load. Refresh to try again.");
    return;
  }
  const html = gameId && fields ? injectPreviewTags(shell, fields, `${origin}${previewImagePath(gameId, previewTheme(req.query["theme"]), fields)}`) : shell;
  res.set("Cache-Control", "no-cache").type("html").send(html);
}
