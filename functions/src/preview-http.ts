import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { isGameId, PreviewFields, previewImagePath, previewTheme, PreviewTheme } from "./preview-card";
import { renderPreviewPng } from "./preview-image";

export type ReadPreview = (gameId: string) => Promise<PreviewFields | null>;

/** The version in the path busts chat-app caches. It must be the board's current one, so made-up versions can't force a fresh render each time. */
const IMAGE_PATH = /^\/og\/game\/([^/]+)\/(light|dark)-([a-f0-9]{1,16})\.png$/;
const FALLBACK_IMAGE = "/assets/og-image.png";

/** /og/game/{id}/{theme}-{version}.png, or null for anything else. */
export function parseImagePath(path: string): { gameId: string; theme: PreviewTheme; version: string } | null {
  const match = IMAGE_PATH.exec(path);
  if (!match || !isGameId(match[1])) return null;
  return { gameId: match[1], theme: previewTheme(match[2]), version: match[3] };
}

/** Serves a board's link-preview PNG. If drawing fails, chat apps get the site's generic picture instead of a broken one. */
export async function servePreviewImage(req: Request, res: Response, readPreview: ReadPreview, log: (message: string, details: object) => void): Promise<void> {
  const target = parseImagePath(req.path);
  if (!target) {
    res.status(404).send("Not found");
    return;
  }
  try {
    const fields = await readPreview(target.gameId);
    if (!fields) {
      res.status(404).send("Not found");
      return;
    }
    const current = previewImagePath(target.gameId, target.theme, fields);
    if (current !== req.path) {
      res.set("Cache-Control", "public, max-age=60").redirect(302, current);
      return;
    }
    const png = await renderPreviewPng(fields, target.theme);
    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400").type("png").send(png);
  } catch (error) {
    log("preview image failed", { gameId: target.gameId, error: String(error) });
    res.set("Cache-Control", "public, max-age=60").redirect(302, FALLBACK_IMAGE);
  }
}
