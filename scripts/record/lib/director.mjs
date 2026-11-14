// A Take is one recorded clip: a page, its capture, and the storyboard shots played on it.
// Each shot keeps its caption and timing, saved beside the video as .srt and .shots.json,
// so the edit can burn in captions without anyone retiming them.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Capture, makeSocialCut } from './capture.mjs';
import { DEVICES } from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Take {
  /**
   * @param {object} o
   * @param {import('playwright').Page} o.page
   * @param {'phone'|'desktop'} o.device
   * @param {string} o.name file stem, for example "01-create-phone"
   * @param {string} o.outDir
   * @param {number} [o.pace] 1 is the storyboard's pace; 0.5 is twice as fast (for test runs)
   */
  constructor({ page, device, name, outDir, pace = 1 }) {
    this.page = page;
    this.device = device;
    this.name = name;
    this.outDir = outDir;
    this.pace = pace;
    this.cues = [];
    this.mouse = { x: DEVICES[device].context.viewport.width / 2, y: DEVICES[device].context.viewport.height / 2 };
    const { width, height } = DEVICES[device].capture;
    this.capture = new Capture(page, { width, height, workDir: join(outDir, `.frames-${name}`) });
  }

  get phone() {
    return this.device === 'phone';
  }

  async start() {
    await this.capture.start();
  }

  /**
   * One storyboard shot. Runs the action, then holds until the shot has run its length.
   * @param {number} n shot number from the storyboard
   * @param {string} caption burned-in caption text
   * @param {number} seconds rough length from the storyboard
   * @param {() => Promise<void>} [action]
   */
  async shot(n, caption, seconds, action) {
    const start = Date.now() / 1000;
    if (action) await action();
    const wanted = seconds * this.pace;
    const spent = Date.now() / 1000 - start;
    if (spent < wanted) await sleep((wanted - spent) * 1000);
    this.cues.push({ shot: n, caption, start, end: Date.now() / 1000 });
  }

  /** A held beat, for reading. */
  async hold(ms) {
    await sleep(ms * this.pace);
  }

  /** Scrolls an element to the middle of the screen, smoothly, if it is not already in view. */
  async reveal(locator) {
    await locator.waitFor({ state: 'visible' });
    const inView = await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    if (!inView) {
      await locator.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await sleep(650);
    }
  }

  /** Desktop: glides the pointer to the element's middle with an ease-in-out curve. */
  async glide(locator, ms = 650) {
    await this.reveal(locator);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Nothing to point at: ${locator}`);
    const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (this.phone) return to;
    const steps = Math.max(8, Math.round((ms * this.pace) / 16));
    const from = { ...this.mouse };
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await this.page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    }
    this.mouse = to;
    return to;
  }

  /** Hover (desktop) or a beat of looking (phone). */
  async point(locator, holdMs = 700) {
    await this.glide(locator);
    await this.hold(holdMs);
  }

  /** Click on desktop, tap on phone, with a short settle either side. */
  async press(locator) {
    const to = await this.glide(locator);
    await this.hold(120);
    if (this.phone) {
      await locator.tap();
    } else {
      await this.page.mouse.move(to.x, to.y);
      await this.page.mouse.down();
      await sleep(70);
      await this.page.mouse.up();
    }
    await this.hold(250);
  }

  /** Types at a person's pace into a field. */
  async type(locator, text) {
    await this.press(locator);
    await locator.fill('');
    await locator.pressSequentially(text, { delay: Math.round(85 * this.pace) });
    await this.hold(200);
  }

  /** Writes the MP4, the 9:16 social cut for phone takes, and the captions. */
  async stop() {
    const video = join(this.outDir, `${this.name}.mp4`);
    const { videoStart } = await this.capture.stop(video);
    const cues = this.cues.map((c) => ({
      shot: c.shot,
      caption: c.caption,
      start: +(c.start - videoStart).toFixed(2),
      end: +(c.end - videoStart).toFixed(2),
    }));
    await writeFile(join(this.outDir, `${this.name}.shots.json`), JSON.stringify({ clip: this.name, device: this.device, cues }, null, 2));
    await writeFile(join(this.outDir, `${this.name}.srt`), toSrt(cues));
    const files = [video];
    if (this.phone) {
      const social = join(this.outDir, `${this.name}-social-9x16.mp4`);
      await makeSocialCut(video, social);
      files.push(social);
    }
    return files;
  }
}

function toSrt(cues) {
  const ts = (s) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
  };
  return cues
    .filter((c) => c.caption)
    .map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.caption}\n`)
    .join('\n');
}
