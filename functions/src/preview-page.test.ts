import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { PreviewFields } from "./preview-card";
import { escapeHtml } from "./html";
import type { ReadPreview } from "./preview-http";
import { gameIdFromPath, imageAlt, injectPreviewTags, PageDeps, serveGamePage, siteOrigin } from "./preview-page";

const fields: PreviewFields = {
  name: "DUKE @ MIA squares", boardSize: 100, squaresFilled: 3, isLocked: false,
  awayTeam: "DUKE", homeTeam: "MIA", espnSport: "ncaaf", espnEventId: "401",
};

/** The tags game.html carries today (scripts/prepare-spa-shell.mjs on top of src/index.html). */
const SHELL = [
  '<head><title>Join the squares board on QuarterScore</title>',
  '<meta property="og:title" content="Join the squares board on QuarterScore">',
  '<meta property="og:image" content="https://quarterscore.com/assets/og-image.png">',
  '<meta property="og:image:alt" content="QuarterScore. Every square, every score, live on one board.™">',
  '<meta name="twitter:title" content="Join the squares board on QuarterScore">',
  '<meta name="twitter:image" content="https://quarterscore.com/assets/og-image.png">',
  '<meta name="twitter:image:alt" content="QuarterScore. Every square, every score, live on one board.™">',
  '</head><body><app-root ngSkipHydration></app-root></body>',
].join("\n");

function fakeRes() {
  const sent: { status: number; headers: Record<string, string>; type?: string; body?: string } = { status: 200, headers: {} };
  const res = {
    status(code: number) { sent.status = code; return res; },
    set(name: string, value: string) { sent.headers[name] = value; return res; },
    type(value: string) { sent.type = value; return res; },
    send(body: string) { sent.body = body; return res; },
  };
  return { res: res as unknown as Response, sent };
}

function fakeReq(path: string, host: string, theme?: string): Request {
  return { path, hostname: host, query: theme ? { theme } : {}, get: () => host } as unknown as Request;
}

describe("gameIdFromPath and siteOrigin", () => {
  it("takes the id from /game/{id} only", () => {
    assert.equal(gameIdFromPath("/game/K7QX2P"), "K7QX2P");
    assert.equal(gameIdFromPath("/game/-Nx_1/"), "-Nx_1");
    assert.equal(gameIdFromPath("/game/K7QX2P/extra"), null);
    assert.equal(gameIdFromPath("/game/%2e%2e"), null);
  });
  it("keeps the live site and its preview channels, and sends any other host to the live site", () => {
    assert.equal(siteOrigin("quarterscore.com"), "https://quarterscore.com");
    assert.equal(siteOrigin("squares-4e4f7--pr350-abc123.web.app"), "https://squares-4e4f7--pr350-abc123.web.app");
    assert.equal(siteOrigin("evil.example"), "https://quarterscore.com");
    assert.equal(siteOrigin("squares-4e4f7.web.app.evil.example"), "https://quarterscore.com");
    assert.equal(siteOrigin(undefined), "https://quarterscore.com");
  });
});

describe("injectPreviewTags", () => {
  it("swaps in the board's title, picture and alt text and leaves the rest", () => {
    const html = injectPreviewTags(SHELL, fields, "https://quarterscore.com/og/game/K7/light-ab.png");
    assert.match(html, /<meta property="og:title" content="DUKE @ MIA squares">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/quarterscore.com\/og\/game\/K7\/light-ab.png">/);
    assert.match(html, /<meta property="og:image:alt" content="DUKE @ MIA squares: 97 of 100 squares open">/);
    assert.match(html, /<title>Join the squares board on QuarterScore<\/title>/);
    assert.ok(!html.includes("assets/og-image.png"));
  });
  it("escapes what the host typed", () => {
    const html = injectPreviewTags(SHELL, { ...fields, name: '"><script>x</script>' }, "https://quarterscore.com/x.png");
    assert.ok(!html.includes("<script>"));
    assert.match(html, /content="&quot;&gt;&lt;script&gt;x&lt;\/script&gt;"/);
    assert.equal(escapeHtml("a&b'c"), "a&amp;b&#39;c");
  });
  it("says locked or full in the alt text", () => {
    assert.equal(imageAlt({ ...fields, isLocked: true }), "DUKE @ MIA squares: board locked");
    assert.equal(imageAlt({ ...fields, boardSize: 25, squaresFilled: 25 }), "DUKE @ MIA squares: all 25 squares taken");
  });
});

describe("serveGamePage", () => {
  const deps = (overrides: Partial<PageDeps> = {}): PageDeps => ({
    readPreview: async () => fields, fetchShell: async () => SHELL, log: () => undefined, ...overrides,
  });

  it("serves the shell from the same preview channel, with a dark picture when the link asks", async () => {
    const origins: string[] = [];
    const { res, sent } = fakeRes();
    await serveGamePage(fakeReq("/game/K7QX2P", "squares-4e4f7--pr9-x.web.app", "dark"), res, deps({ fetchShell: async o => { origins.push(o); return SHELL; } }));
    assert.deepEqual(origins, ["https://squares-4e4f7--pr9-x.web.app"]);
    assert.match(sent.body ?? "", /og\/game\/K7QX2P\/dark-[a-f0-9]{10}\.png/);
    assert.equal(sent.headers["Cache-Control"], "no-cache");
  });
  it("serves the plain shell for a missing board or a failed read, and logs the failure", async () => {
    const cases: Array<[ReadPreview, number]> = [[async () => null, 0], [async () => { throw new Error("down"); }, 1]];
    for (const [readPreview, logs] of cases) {
      const { res, sent } = fakeRes();
      const logged: string[] = [];
      await serveGamePage(fakeReq("/game/K7QX2P", "quarterscore.com"), res, deps({ readPreview, log: message => logged.push(message) }));
      assert.equal(sent.body, SHELL);
      assert.equal(logged.length, logs);
    }
  });
  it("doesn't read the database for a path that isn't a board", async () => {
    let reads = 0;
    const { res, sent } = fakeRes();
    await serveGamePage(fakeReq("/game/a/b", "quarterscore.com"), res, deps({ readPreview: async () => { reads++; return fields; } }));
    assert.equal(reads, 0);
    assert.equal(sent.body, SHELL);
  });
  it("answers 502 when game.html can't be fetched", async () => {
    const { res, sent } = fakeRes();
    await serveGamePage(fakeReq("/game/K7QX2P", "quarterscore.com"), res, deps({ fetchShell: async () => { throw new Error("x"); } }));
    assert.equal(sent.status, 502);
  });
});
