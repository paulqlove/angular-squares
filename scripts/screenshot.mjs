// Dev-only: saves phone and desktop PNGs of a page for PR reviews.
// Usage: node scripts/screenshot.mjs <url> <out-prefix> [--dark]
// Writes <out-prefix>-phone.png and <out-prefix>-desktop.png.
// Drives Chromium over the DevTools protocol with Node's built-in WebSocket,
// so it needs no driver package. Never imported by the app or functions.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import chromium from '@sparticuz/chromium';

const SIZES = {
  phone: { width: 412, height: 915, deviceScaleFactor: 2, mobile: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
};
const SETTLE_MS = 1500;
const TIMEOUT_MS = 30000;

const [url, outPrefix] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const dark = process.argv.includes('--dark');

if (!url || !outPrefix) {
  console.error('Usage: node scripts/screenshot.mjs <url> <out-prefix> [--dark]');
  process.exit(1);
}

const browser = spawn(await chromium.executablePath(), [
  ...chromium.args.filter((arg) => !arg.startsWith('--headless')),
  '--headless=shell',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  'about:blank',
]);

let socket;
try {
  socket = await connect(await devtoolsUrl(browser));
  for (const [name, size] of Object.entries(SIZES)) {
    const file = `${outPrefix}-${name}.png`;
    await writeFile(file, await capture(socket, size));
    console.log(`Saved ${file}`);
  }
} finally {
  socket?.close();
  browser.kill();
}

function devtoolsUrl(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chromium did not start')), TIMEOUT_MS);
    child.stderr.on('data', (chunk) => {
      const match = /DevTools listening on (ws:\S+)/.exec(chunk.toString());
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    });
  });
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('Could not reach Chromium'));
  });
  let nextId = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const call = pending.get(message.id);
    if (call) {
      pending.delete(message.id);
      message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result);
      return;
    }
    const index = waiters.findIndex((w) => w.method === message.method);
    if (index >= 0) waiters.splice(index, 1)[0].resolve();
  };
  const send = (method, params = {}, sessionId) => {
    const id = ++nextId;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));
  return { send, once, close: () => ws.close() };
}

async function capture({ send, once }, size) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', size, sessionId);
  const scheme = dark ? 'dark' : 'light';
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] }, sessionId);
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url }, sessionId);
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS).unref())]);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await send('Target.closeTarget', { targetId });
  return Buffer.from(data, 'base64');
}
