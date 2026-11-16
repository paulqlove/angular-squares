// Run: npm run test:scripts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { lastmodFor } from './page-dates.mjs';

const dates = { '/': '2026-11-13', '/faq': '2026-11-15', '/team/*': '2026-11-14' };

test('uses each page\'s own date', () => {
  assert.equal(lastmodFor('/', dates), '2026-11-13');
  assert.equal(lastmodFor('/faq', dates), '2026-11-15');
});

test('team pages share the /team/* date', () => {
  assert.equal(lastmodFor('/team/dallas-cowboys', dates), '2026-11-14');
});

test('blog posts use their own date first', () => {
  const posts = new Map([['/blog/pick-numbers', '2026-11-20']]);
  assert.equal(lastmodFor('/blog/pick-numbers', dates, posts), '2026-11-20');
});

test('a page with no date fails the build', () => {
  assert.throws(() => lastmodFor('/new-page', dates), /scripts\/page-dates\.json/);
});

test('every date in scripts/page-dates.json is a real YYYY-MM-DD', () => {
  const file = JSON.parse(fs.readFileSync(new URL('../scripts/page-dates.json', import.meta.url), 'utf8'));
  for (const [urlPath, date] of Object.entries(file)) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/, urlPath);
    assert.ok(!Number.isNaN(Date.parse(date)), urlPath);
  }
});
