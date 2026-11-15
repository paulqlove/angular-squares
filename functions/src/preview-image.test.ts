import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PreviewFields, previewImagePath } from "./preview-card";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { parseImagePath, servePreviewImage } from "./preview-http";
import { renderPreviewPng } from "./preview-image";

const fields: PreviewFields = {
  name: "DUKE @ MIA squares", boardSize: 100, squaresFilled: 3, isLocked: false,
  awayTeam: "DUKE", homeTeam: "MIA", espnSport: "ncaaf", espnEventId: "401",
};

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe("parseImagePath", () => {
  it("reads the board and theme, and rejects anything else", () => {
    assert.deepEqual(parseImagePath("/og/game/K7QX2P/dark-0a1b2c3d4e.png"), { gameId: "K7QX2P", theme: "dark", version: "0a1b2c3d4e" });
    assert.deepEqual(parseImagePath("/og/game/-Nx_1/light-ff.png"), { gameId: "-Nx_1", theme: "light", version: "ff" });
    assert.equal(parseImagePath("/og/game/K7QX2P/sepia-0a.png"), null);
    assert.equal(parseImagePath("/og/game/../users/light-0a.png"), null);
    assert.equal(parseImagePath("/og/game/K7QX2P.png"), null);
  });
});

describe("renderPreviewPng", () => {
  it("draws a 1200x630 PNG, and still draws one when ESPN and the logos fail", async () => {
    const fail = async () => { throw new Error("offline"); };
    const png = await renderPreviewPng(fields, "dark", { fetchJson: fail, fetchBytes: fail });
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.deepEqual(pngSize(png), [1200, 630]);
  });
  it("skips a logo that isn't a PNG or JPEG", async () => {
    let asked = 0;
    const png = await renderPreviewPng({ ...fields, isLocked: true }, "light", {
      fetchJson: async () => ({ header: { competitions: [{ competitors: [{ team: { abbreviation: "DUKE", name: "Blue Devils", logo: "https://a.espncdn.com/x.svg" } }] }] } }),
      fetchBytes: async () => { asked++; return { type: "image/svg+xml", bytes: Buffer.from("<svg/>") }; },
    });
    assert.equal(asked, 1);
    assert.deepEqual(pngSize(png), [1200, 630]);
  });
});

describe("servePreviewImage", () => {
  const offline: PreviewFields = { ...fields, awayTeam: "Uncle Bob", homeTeam: "Aunt Sue", espnEventId: "" };
  const current = previewImagePath("K7QX2P", "light", offline);

  function call(path: string, readPreview: () => Promise<PreviewFields | null>) {
    const sent: { status: number; headers: Record<string, string>; redirect?: string; body?: unknown } = { status: 200, headers: {} };
    const res = {
      status(code: number) { sent.status = code; return res; },
      set(name: string, value: string) { sent.headers[name] = value; return res; },
      type() { return res; },
      send(body: unknown) { sent.body = body; return res; },
      redirect(code: number, to: string) { sent.status = code; sent.redirect = to; return res; },
    };
    return servePreviewImage({ path } as Request, res as unknown as Response, readPreview, () => undefined).then(() => sent);
  }

  it("draws the current version and lets the CDN keep it", async () => {
    const sent = await call(current, async () => offline);
    assert.ok(Buffer.isBuffer(sent.body));
    assert.equal(sent.headers["Cache-Control"], "public, max-age=3600, s-maxage=86400");
  });
  it("sends a stale or made-up version to the current one without drawing", async () => {
    const sent = await call("/og/game/K7QX2P/light-0000000000.png", async () => offline);
    assert.deepEqual([sent.status, sent.redirect], [302, current]);
  });
  it("answers 404 for a bad path or a missing board, and falls back to the site picture on errors", async () => {
    assert.equal((await call("/og/game/K7QX2P.png", async () => offline)).status, 404);
    assert.equal((await call(current, async () => null)).status, 404);
    const failed = await call(current, async () => { throw new Error("db down"); });
    assert.deepEqual([failed.status, failed.redirect], [302, "/assets/og-image.png"]);
  });
});
