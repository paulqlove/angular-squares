// Builds the files AI assistants and crawlers read: src/llms.txt (a short map of the site) and src/llms-full.txt
// (every guide's text in one file). Both come from the same page data the site renders, so they stay in step with the
// pages. Run from scripts/build-content.mjs after schedule.generated.ts is written, because the page data imports it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/** Short, quotable facts. Each one is a real feature; keep it that way when the product changes. */
const FACTS = [
  'Free to use. Creating a board and claiming squares costs nothing.',
  'QuarterScore never collects, holds, or pays out money. Most groups play for bragging rights.',
  'Players do not need an account. They open the link and type a name on a square. Only the host signs in, to save and run the board.',
  'Boards come in 100, 50 or 25 squares.',
  'A board is shared by one link or a six-character game code. Games are not listed in a public directory.',
  'Squares update in real time for everyone on the board.',
  'The host locks the board, then the digits 0 through 9 are drawn at random for the rows and the columns, so nobody picks a digit.',
  'Quarter winners are found automatically from the last digit of each team\'s score.',
  'Boards can follow a live game: the score and clock come from ESPN, for NFL, NCAA football, UFL, NBA, WNBA and AFL games. Any other game works as a custom board with your own team names.',
  'Points split 20, 20, 20 and 40 percent across the four quarters as standard. These are points, never money.',
  'If a quarter\'s winning square is empty, the host chooses whether its points roll into the final quarter or are shared across the other quarters.',
  'Hosts can mark players as checked in or paid, add a co-host, and leave a short note on the board.',
  'TV mode puts the board, live score, quarter winners and a QR code to join on a big screen. It can rotate through several boards every 10 to 60 seconds, and Copy TV link opens it on any screen with no sign-in.',
  'A printable blank 10 by 10 grid and a PDF are free to download.',
  'The Best numbers page and the Hit rate tab show how often each last-digit pair has come up in historical scoring.'
];

/** Pages that are not in the marketing page data, in the order they are listed. */
const TOOL_PAGES = [
  { path: '/create', label: 'Create a free board', text: 'Set up a 100, 50 or 25 square board. The host signs in when the board is saved.' },
  { path: '/best-squares-numbers', label: 'Best squares numbers', text: 'How often each last-digit pair has shown up in historical scoring.' },
  { path: '/printable-football-squares', label: 'Printable football squares', text: 'A free blank 10 by 10 grid, a print view and a PDF.' },
  { path: '/teams', label: 'Football squares by NFL team', text: 'A board page for each of the 32 NFL teams.' }
];

/** Marketing page ids that are policies, listed under Optional rather than with the guides. */
const POLICY_IDS = new Set(['terms', 'privacy', 'contact']);

export async function writeAgentFiles({ root, origin, posts }) {
  const data = await loadPageData(root);
  const probabilities = data.SQUARES_PROBABILITIES;
  const pages = Object.values(data.MARKETING_PAGES);
  const teams = data.NFL_TEAMS;
  const url = p => (p === '/' ? `${origin}/` : `${origin}${p}`);
  const topPairs = Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, pct]) => {
      const [away, home] = key.split(',');
      return `${away} and ${home} (${pct}%)`;
    });

  const summary = 'QuarterScore is a free website for running football squares (also called Super Bowl squares) online. A host makes a 100, 50 or 25 square board and shares one link, friends claim squares by typing a name, and live scores pick the winner of each quarter. QuarterScore never collects, holds, or pays out money.';
  const guides = pages.filter(p => !POLICY_IDS.has(p.id));
  const policies = pages.filter(p => POLICY_IDS.has(p.id));

  const short = [
    '# QuarterScore',
    '',
    `> ${summary}`,
    '',
    `Site: ${origin}/`,
    '',
    'Key facts:',
    '',
    ...FACTS.map(f => `- ${f}`),
    `- In that history the most common last-digit pairs (away, home) are ${topPairs.join(', ')}. History is not a promise about any one game.`,
    '',
    '## Guides',
    '',
    ...guides.map(p => `- [${p.h1}](${url(p.path)}): ${clean(p.description)}`),
    '',
    '## Tools',
    '',
    ...TOOL_PAGES.map(p => `- [${p.label}](${url(p.path)}): ${p.text}`),
    '',
    '## NFL team boards',
    '',
    ...teams.map(t => `- [${t.city} ${t.name} football squares](${url(`/team/${t.slug}`)})`),
    ''
  ];
  if (posts.length) {
    short.push('## Blog', '', ...posts.map(p => `- [${clean(p.title)}](${url(`/blog/${p.slug}`)}): ${clean(p.description)}`), '');
  }
  short.push(
    '## Optional',
    '',
    `- [Full text of every guide](${url('/llms-full.txt')}): the guides, steps and FAQs above in one plain-text file.`,
    ...policies.map(p => `- [${p.h1}](${url(p.path)}): ${clean(p.description)}`),
    `- [Sitemap](${url('/sitemap.xml')})`,
    ...(posts.length ? [`- [Blog RSS feed](${url('/rss.xml')})`] : []),
    ''
  );

  const full = [
    '# QuarterScore: full guide text',
    '',
    `> ${summary}`,
    '',
    `This file collects the text of every guide on ${origin}/ so an assistant can answer from one place. Each section names the page it came from.`,
    '',
    '## Key facts',
    '',
    ...FACTS.map(f => `- ${f}`),
    ''
  ];
  for (const page of [...guides, ...policies]) {
    full.push(`## ${clean(page.h1)}`, '', `Source: ${url(page.path)}`, '', clean(page.lede), '');
    if (page.notice) full.push(clean(page.notice), '');
    if (page.steps?.length) {
      full.push('### Steps', '', ...page.steps.map((s, i) => `${i + 1}. ${clean(s.name)}: ${clean(s.text)}`), '');
    }
    for (const section of page.sections) {
      // A paragraph that leads into a diagram or an address shown only on the page points to the page instead.
      const paragraphs = section.paragraphs.map(clean).filter(Boolean).map(t => (section.html && t.endsWith(':') ? `${t.slice(0, -1)}: shown on ${url(page.path)}.` : t)).map(t => siteLinks(t, origin));
      const bullets = (section.bullets ?? []).map(clean).filter(Boolean).map(t => siteLinks(t, origin));
      if (!paragraphs.length && !bullets.length) continue;
      full.push(`### ${clean(section.heading)}`, '');
      for (const para of paragraphs) full.push(para, '');
      if (bullets.length) full.push(...bullets.map(b => `- ${b}`), '');
    }
    if (page.faqs?.length) {
      full.push('### Questions', '');
      for (const faq of page.faqs) full.push(`**${clean(faq.question)}**`, '', clean(faq.answer), '');
    }
    if (page.disclaimer) full.push(clean(page.disclaimer), '');
  }
  full.push(
    '## Best squares numbers',
    '',
    `Source: ${url('/best-squares-numbers')}`,
    '',
    'How often each pair of last digits (away team, home team) has shown up in historical scoring, in percent. One grid covers the whole game, because the source does not split it by quarter. History is not a promise about any one game.',
    '',
    `The five most common pairs: ${topPairs.join(', ')}.`,
    ''
  );

  fs.writeFileSync(path.join(root, 'src', 'llms.txt'), `${short.join('\n').trimEnd()}\n`);
  fs.writeFileSync(path.join(root, 'src', 'llms-full.txt'), `${full.join('\n').trimEnd()}\n`);
}

/** Plain text: no HTML tags or entities, one line. Markdown bold stays, since both files are Markdown. */
function clean(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Page copy links other pages as [label](/path); this file is read off the site, so the paths become full URLs. Same paths as SITE_LINK in rich-text.ts. */
function siteLinks(text, origin) {
  return text.replace(/\]\((\/(?!\/)[a-z0-9/-]*)\)/g, `](${origin}$1)`);
}

/** Bundles the TypeScript page data into a temporary module and imports it. */
async function loadPageData(root) {
  const content = path.join(root, 'src', 'app', 'features', 'content');
  const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qs-agent-')), 'pages.mjs');
  await build({
    stdin: {
      contents: `export { MARKETING_PAGES } from './marketing-pages';\nexport { NFL_TEAMS } from './teams-data';\nexport { SQUARES_PROBABILITIES } from '../super-bowl-squares/utils/probability.utils';\n`,
      resolveDir: content,
      loader: 'ts'
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    outfile,
    logLevel: 'warning'
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(path.dirname(outfile), { recursive: true, force: true });
  }
}
