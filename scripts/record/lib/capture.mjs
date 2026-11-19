// Records one page to an MP4. Chromium's screencast sends a high-quality JPEG each time the
// page paints; we keep each frame's timestamp, then ffmpeg turns them into constant-frame-rate
// H.264, so a 3-second hold stays 3 seconds. Sharper than Playwright's built-in recordVideo.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { COLORS, FPS, SOCIAL } from './config.mjs';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

/** ffmpeg from the ffmpeg-static package, else one on PATH. */
export function ffmpegPath() {
  try {
    const p = require('ffmpeg-static');
    if (p && existsSync(p)) return p;
  } catch {}
  return 'ffmpeg';
}

export class Capture {
  constructor(page, { width, height, workDir }) {
    this.page = page;
    this.width = width;
    this.height = height;
    this.workDir = workDir;
    this.frames = [];
    this.pending = [];
    this.startedAt = 0;
  }

  async start() {
    await rm(this.workDir, { recursive: true, force: true });
    await mkdir(this.workDir, { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const n = this.frames.length;
      const file = join(this.workDir, `f${String(n).padStart(6, '0')}.jpg`);
      this.frames.push({ file, t: metadata.timestamp });
      this.pending.push(writeFile(file, Buffer.from(data, 'base64')));
      this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    this.startedAt = Date.now() / 1000;
    await this.cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: this.width,
      maxHeight: this.height,
      everyNthFrame: 1,
    });
  }

  /** Seconds since the take began, on the same clock as the frames. */
  now() {
    return Date.now() / 1000 - this.startedAt;
  }

  /** Stops capture and writes the MP4. Returns the video's start time on the wall clock. */
  async stop(outFile) {
    const endedAt = Date.now() / 1000;
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    await this.cdp.detach().catch(() => {});
    await Promise.all(this.pending);
    if (!this.frames.length) throw new Error(`No frames were captured for ${outFile}`);
    // The first frame defines t=0. Each frame lasts until the next; the last until stop.
    const lines = [];
    // The video starts when capture started: the first frame is shown from then on, so shot
    // times measured from the start line up even if the first paint came a moment later.
    const first = Math.min(this.frames[0].t, this.startedAt);
    for (let i = 0; i < this.frames.length; i++) {
      const from = i === 0 ? first : this.frames[i].t;
      const end = i + 1 < this.frames.length ? this.frames[i + 1].t : endedAt;
      const dur = Math.max(1 / FPS, end - from);
      lines.push(`file '${this.frames[i].file}'`, `duration ${dur.toFixed(4)}`);
    }
    lines.push(`file '${this.frames[this.frames.length - 1].file}'`);
    const list = join(this.workDir, 'frames.txt');
    await writeFile(list, lines.join('\n'));
    await run(ffmpegPath(), [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${this.width}:${this.height}:(ow-iw)/2:(oh-ih)/2:color=white,fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
      outFile,
    ], { maxBuffer: 1 << 26 });
    await rm(this.workDir, { recursive: true, force: true });
    return { videoStart: first, wallStart: this.startedAt };
  }
}

/**
 * The 9:16 social cut: the phone recording at about 80% sits in the top of a paper frame,
 * so nothing of the app falls under TikTok's and Reels' own buttons (bottom 20%, right 12%).
 */
export async function makeSocialCut(phoneFile, outFile) {
  const paper = COLORS.paper.replace('#', '0x');
  const navy = COLORS.navy.replace('#', '0x');
  const h = SOCIAL.phoneHeight;
  await run(ffmpegPath(), [
    '-y', '-loglevel', 'error', '-i', phoneFile,
    '-filter_complex',
    `color=c=${paper}:s=${SOCIAL.width}x${SOCIAL.height}:r=${FPS}[bg];` +
      `[0:v]scale=-2:${h}:flags=lanczos,pad=iw+6:ih+6:3:3:color=${navy}[ph];` +
      `[bg][ph]overlay=x=(W-w)/2:y=${SOCIAL.top}:shortest=1,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
    outFile,
  ], { maxBuffer: 1 << 26 });
}

/** Duration in seconds, read back with ffmpeg (used by the self-test). */
export async function probeDuration(file) {
  const { stderr } = await run(ffmpegPath(), ['-hide_banner', '-i', file]).catch((e) => e);
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr || '');
  const size = /Stream .* Video: .*?, (\d{2,5})x(\d{2,5})/.exec(stderr || '');
  return {
    seconds: m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN,
    width: size ? Number(size[1]) : NaN,
    height: size ? Number(size[2]) : NaN,
  };
}
