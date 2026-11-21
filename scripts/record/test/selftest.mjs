// Offline check of the recording pipeline: films a small local page on both devices and checks
// the MP4s, the social cut and the caption files. Touches no website. Run: npm test
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { launch, newContext, spread } from '../lib/site.mjs';
import { Take } from '../lib/director.mjs';
import { probeDuration } from '../lib/capture.mjs';


const PAGE = `<!doctype html><meta name=viewport content="width=device-width">
<style>body{font:16px system-ui;background:#f3efe8;color:#0f172a;margin:24px}button{min-height:44px;padding:0 16px}
#grid{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;margin-top:16px}#grid div{aspect-ratio:1;background:#fff}</style>
<h1>Recorder self-test</h1><input id=name placeholder="Your name"> <button id=go onclick="document.body.dataset.done=1;this.textContent='Done'">Join</button>
<div id=grid>${'<div></div>'.repeat(100)}</div>`;

const server = createServer((_, res) => res.end(PAGE)).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const out = await mkdtemp(join(tmpdir(), 'qs-rec-test-'));
const browser = await launch();
let failures = 0;
const check = async (label, fn) => {
  try {
    await fn();
    console.log(`ok   ${label}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${label}: ${e.message}`);
  }
};

try {
  for (const device of ['desktop', 'phone']) {
    const context = await newContext(browser, base, device, { record: true });
    const page = await context.newPage();
    await page.goto('/');
    const take = new Take({ page, device, name: `selftest-${device}`, outDir: out, pace: 0.5 });
    await take.start();
    await take.shot(1, 'Type your name', 2, () => take.type(page.locator('#name'), 'Jess'));
    await take.shot(2, 'Tap join', 2, () => take.press(page.locator('#go')));
    const files = await take.stop();
    await context.close();

    await check(`${device}: video has the expected size and length`, async () => {
      const p = await probeDuration(files[0]);
      const want = device === 'phone' ? [1080, 2338] : [1920, 1080];
      assert.deepEqual([p.width, p.height], want);
      assert.ok(p.seconds >= 1.8 && p.seconds < 6, `length ${p.seconds}s`);
    });
    if (device === 'phone') {
      await check('phone: 9:16 social cut is 1080x1920', async () => {
        const p = await probeDuration(files[1]);
        assert.deepEqual([p.width, p.height], [1080, 1920]);
      });
    }
    await check(`${device}: captions line up with the shots`, async () => {
      const shots = JSON.parse(await readFile(join(out, `selftest-${device}.shots.json`), 'utf8'));
      assert.equal(shots.cues.length, 2);
      if (process.env.DEBUG) console.log(JSON.stringify(shots.cues));
      assert.ok(shots.cues[0].start >= 0 && shots.cues[0].end <= shots.cues[1].start + 0.01);
      assert.ok(shots.cues[1].end - shots.cues[1].start >= 0.95, 'shot 2 holds its length');
      const srt = await readFile(join(out, `selftest-${device}.srt`), 'utf8');
      assert.match(srt, /^1\n00:00:0\d,\d{3} --> 00:00:0\d,\d{3}\nType your name\n/);
    });
  }

  await check('the button press reached the page', async () => {
    const context = await newContext(browser, base, 'desktop', { record: true });
    const page = await context.newPage();
    await page.goto('/');
    const take = new Take({ page, device: 'desktop', name: 'press', outDir: out, pace: 0.2 });
    await take.press(page.locator('#go'));
    assert.equal(await page.evaluate(() => document.body.dataset.done), '1');
    await context.close();
  });

  await check('square picks are spread, unique and repeatable', async () => {
    const open = [...Array(100).keys()];
    const a = spread(open, 10, 3);
    assert.equal(new Set(a).size, 10);
    assert.deepEqual(a, spread(open, 10, 3));
    assert.deepEqual(spread([4, 9], 5), spread([4, 9], 5));
    assert.equal(spread([4, 9], 5).length, 2);
  });
} finally {
  await browser.close();
  server.close();
  await rm(out, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
