// QuarterScore weekly report. Read only. Usage: node scripts/report/report.mjs [days=7]
// Needs the Firebase CLI signed in. Optional Google sections need a service-account key (see docs/REPORTS.md).
import { execFileSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'squares-4e4f7';
const V2_SHIP = Date.parse('2026-11-06T02:38:59Z');
const CFG = join(homedir(), '.config', 'quarterscore');
const days = Number(process.argv[2] || 7);
const now = Date.now();
const DAY = 864e5;

const fb = (path) => {
  const out = execFileSync('npx', ['-y', 'firebase-tools@latest', 'database:get', path, '--project', PROJECT],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  return JSON.parse(out || 'null') || {};
};
const [games, users, admins, notifyMe, views] = ['/games', '/users', '/admins', '/notifyMe', '/upgradeViews'].map(fb);

// Accounts left out of every count: admins plus uids listed one per line in ~/.config/quarterscore/exclude-uids.txt
const exFile = join(CFG, 'exclude-uids.txt');
const listed = existsSync(exFile) ? readFileSync(exFile, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : [];
const excluded = new Set([...Object.keys(admins), ...listed]);
const out = [];
const p = (s = '') => out.push(s);
// Counts always shown; a percentage only when n >= 30.
const rate = (k, n) => (n >= 30 ? `${k}/${n} (${Math.round((100 * k) / n)}%)` : `${k}/${n} (too few to read as a rate)`);
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const weekStart = (ms) => { const d = new Date(ms); const dow = (d.getUTCDay() + 6) % 7; return day(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)); };

const boards = Object.entries(games).map(([id, g]) => ({ id, ...g })).filter((g) => g.ownerId && !excluded.has(g.ownerId));
const filled = (g) => Object.values(g.squares || g.selectedSquares || {}).filter(Boolean).length;
const size = (g) => g.boardSize || 100;
const byHost = {};
boards.forEach((g) => (byHost[g.ownerId] ??= []).push(g));
Object.values(byHost).forEach((l) => l.sort((a, b) => a.createdAt - b.createdAt));
const hosts = Object.keys(byHost);

p(`# QuarterScore report, last ${days} days (to ${day(now)} UTC)`);
p(`Excludes ${excluded.size} account(s) (${Object.keys(admins).length} admin, ${listed.length} listed). Percentages appear only when n >= 30.`);

// 1. Jan 15 bar
const clicks = Object.values(notifyMe).filter((e) => e.timestamp >= V2_SHIP && e.source !== 'ended_board_dialog' && !excluded.has(e.uid));
const clickHosts = new Set(clicks.map((e) => e.uid));
const shown = Object.entries(views).filter(([uid, r]) => r.limitCount !== undefined && !excluded.has(uid));
const lastWeekClicks = clicks.filter((e) => e.timestamp >= now - days * DAY).length;
p('\n## 1. Season Pass test (read on Jan 15 2027; bar = 15 clicks AND 150 hosts shown)');
p(`- Notify-me clicks since Nov 6: ${clicks.length} from ${clickHosts.size} host(s) (${lastWeekClicks} in the last ${days} days). By trigger: limit ${clicks.filter((e) => e.trigger === 'limit').length}, See Season Pass ${clicks.filter((e) => e.trigger === 'pass').length}`);
p(`- Hosts shown the dialog: ${shown.length}. Click rate: ${rate(clickHosts.size, shown.length)}`);
const daysLeft = Math.max(0, Math.ceil((Date.parse('2027-01-15') - now) / DAY));
const needClicks = Math.max(0, 15 - clicks.length), needShown = Math.max(0, 150 - shown.length);
p(`- To clear the bar: ${needClicks} more click(s) and ${needShown} more host(s) shown, ${daysLeft} days left. ${needClicks === 0 && needShown === 0 ? 'ON TRACK: bar met.' : (shown.length / Math.max(1, (now - V2_SHIP) / DAY)) * daysLeft >= needShown ? 'On pace for hosts shown at the current rate.' : 'BEHIND on hosts shown at the current rate.'}`);
p('- Dollar view (assumption, not data): clicks x 10-30% buying x $5.52 net; break-even is 55 passes at an assumed $300/yr cost.');
const lo = Math.round(clicks.length * 0.1 * 5.52), hi = Math.round(clicks.length * 0.3 * 5.52);
p(`  Current clicks imply about $${lo}-$${hi}, against $304 to break even.`);

// 2. Weekly trend
p('\n## 2. New hosts and boards per week (last 8 weeks, UTC Monday start)');
const wk = {};
boards.forEach((g) => { const w = weekStart(g.createdAt); (wk[w] ??= { boards: 0, hosts: new Set() }).boards++; wk[w].hosts.add(g.ownerId); });
Object.keys(wk).sort().slice(-8).forEach((w) => p(`- ${w}: ${wk[w].boards} board(s), ${wk[w].hosts.size} host(s)`));
if (!Object.keys(wk).length) p('- none');
p('- Pre-season and playoff weeks differ; read this as a shape, not a forecast.');

// 3. Repeat hosts
const mature = hosts.filter((h) => now - byHost[h][0].createdAt >= 14 * DAY);
const repeat = mature.filter((h) => byHost[h][1] && byHost[h][1].createdAt - byHost[h][0].createdAt <= 14 * DAY);
const cut = (list) => { const m = list.filter((h) => byHost[h][0].espnEventId); return [m, list.filter((h) => !byHost[h][0].espnEventId)]; };
const [mEspn, mCustom] = cut(mature);
p('\n## 3. Repeat hosts (second board within 14 days of the first)');
p(`- All: ${rate(repeat.length, mature.length)}. Hosts whose first board is under 14 days old are left out.`);
p(`- First board ESPN-linked: ${rate(mEspn.filter((h) => repeat.includes(h)).length, mEspn.length)}. Custom: ${rate(mCustom.filter((h) => repeat.includes(h)).length, mCustom.length)}`);
p('- Deleted boards are invisible here. The window suits weekly NFL hosts and undercounts one-night Super Bowl hosts.');

// 4. Funnel
const inWin = boards.filter((g) => g.createdAt >= now - days * DAY);
const stages = (l) => [l.length, l.filter((g) => filled(g) >= size(g) / 2).length, l.filter((g) => g.isLocked || g.isRandomized).length, l.filter((g) => (g.scores?.q4?.home || 0) + (g.scores?.q4?.away || 0) > 0).length];
p('\n## 4. Host funnel (counts, boards by non-excluded hosts)');
for (const [name, l] of [['All time', boards], [`Last ${days} days`, inWin]]) {
  const [a, b, c, d] = stages(l);
  p(`- ${name}: created ${a} > half full ${b} > locked or numbers drawn ${c} > Q4 score posted ${d}. ESPN-linked ${l.filter((g) => g.espnEventId).length}/${a}`);
}
p(`- Hosts: ${hosts.length} total, ${hosts.filter((h) => byHost[h].length >= 2).length} with 2+ boards on file.`);

// 5. Reuse
const usage = Object.entries(users).filter(([uid, u]) => u?.usage && !excluded.has(uid));
p('\n## 5. Reuse (users/{uid}/usage, counted from Nov 6)');
if (usage.length) {
  const heavy = usage.filter(([, u]) => (u.usage.gamesCreated || 0) + (u.usage.resets || 0) >= 3);
  p(`- Hosts with counters: ${usage.length}. Creates ${usage.reduce((n, [, u]) => n + (u.usage.gamesCreated || 0), 0)}, resets ${usage.reduce((n, [, u]) => n + (u.usage.resets || 0), 0)}, deletes ${usage.reduce((n, [, u]) => n + (u.usage.deletes || 0), 0)}. Hosts with 3+ creates+resets: ${heavy.length}`);
} else p('- No counters yet.');

// 6. Google (optional)
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(CFG, 'google-key.json');
const GA = process.env.GA_PROPERTY_ID || (existsSync(join(CFG, 'ga-property-id.txt')) ? readFileSync(join(CFG, 'ga-property-id.txt'), 'utf8').trim() : '');
const SITE = process.env.GSC_SITE || 'sc-domain:quarterscore.com';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function token(key, scope) {
  const t = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: t, exp: t + 3000 })}`;
  const jwt = `${head}.${createSign('RSA-SHA256').update(head).sign(key.private_key, 'base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || j.error || 'token request failed');
  return j.access_token;
}
const post = async (url, tok, body) => { const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };

p('\n## 6. Traffic (Google Analytics, cookieless so it undercounts; last 2 days lag)');
if (!existsSync(keyPath) || !GA) p(`- Not connected. Needs ${keyPath} and a property ID in ${join(CFG, 'ga-property-id.txt')}. See docs/REPORTS.md.`);
else {
  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'));
    const tok = await token(key, 'https://www.googleapis.com/auth/analytics.readonly');
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA}:runReport`;
    const range = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
    const ch = await post(url, tok, { dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }] });
    (ch.rows || []).forEach((r) => p(`- ${r.dimensionValues[0].value}: ${r.metricValues[0].value} users, ${r.metricValues[1].value} sessions`));
    if (!ch.rows?.length) p('- No data in the window yet.');
    const pg = await post(url, tok, { dateRanges: range, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 8 });
    (pg.rows || []).forEach((r) => p(`  - ${r.dimensionValues[0].value}: ${r.metricValues[0].value} views`));
  } catch (e) { p(`- Google Analytics failed: ${e.message}`); }
}

p('\n## 7. Search (Search Console)');
if (!existsSync(keyPath)) p('- Not connected. See docs/REPORTS.md.');
else {
  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'));
    const tok = await token(key, 'https://www.googleapis.com/auth/webmasters.readonly');
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
    const body = { startDate: day(now - Math.max(days, 7) * DAY), endDate: day(now - 2 * DAY) };
    const tot = await post(url, tok, body);
    const t = tot.rows?.[0];
    p(t ? `- ${body.startDate} to ${body.endDate}: ${t.clicks} clicks, ${t.impressions} impressions, avg position ${t.position.toFixed(1)}` : `- ${body.startDate} to ${body.endDate}: no clicks or impressions yet`);
    const q = await post(url, tok, { ...body, dimensions: ['query'], rowLimit: 8 });
    (q.rows || []).forEach((r) => p(`  - "${r.keys[0]}": ${r.clicks} clicks, ${r.impressions} impressions, position ${r.position.toFixed(1)}`));
  } catch (e) { p(`- Search Console failed: ${e.message}`); }
}

p('\n## Not in this report');
p('- Where new hosts come from (not tracked yet), real monthly costs (pull from billing), and the Stripe numbers (no checkout yet).');
console.log(out.join('\n'));
