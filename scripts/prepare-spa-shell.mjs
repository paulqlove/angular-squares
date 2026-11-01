import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = path.join(root, 'dist', 'angular-squares', 'browser');
const indexPath = path.join(browserDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('prepare-spa-shell: dist index.html is missing. Run the production build first.');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (!/<app-root\b/.test(html)) {
  console.error('prepare-spa-shell: index.html has no app-root element.');
  process.exit(1);
}

let shell = html.replace(
  /<app-root\b[^>]*>[\s\S]*?<\/app-root>/,
  '<app-root ngSkipHydration></app-root>'
);

if (!shell.includes('name="robots"')) {
  shell = shell.replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
} else {
  shell = shell.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="noindex, follow">'
  );
}

shell = shell.replace(/<link\s+rel="canonical"[^>]*>\s*/i, '');
shell = shell.replace(
  /<title>[^<]*<\/title>/,
  '<title>Quarter Score</title>'
);
shell = shell.replace(/<script type="application\/ld\+json" data-seo-jsonld="true">[\s\S]*?<\/script>/g, '');
shell = shell.replace(/<script id="ng-state" type="application\/json">[\s\S]*?<\/script>/g, '');
shell = shell.replace(/<meta property="article:published_time"[^>]*>/g, '');
shell = shell.replace(/<!--nghm-->/g, '');
shell = shell.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="Quarter Score">'
);
shell = shell.replace(/<meta property="og:url" content="[^"]*">/g, '');
shell = shell.replace(
  /<meta property="og:title" content="[^"]*">/,
  '<meta property="og:title" content="Quarter Score">'
);
shell = shell.replace(
  /<meta property="og:description" content="[^"]*">/,
  '<meta property="og:description" content="Quarter Score">'
);
shell = shell.replace(
  /<meta name="twitter:title" content="[^"]*">/,
  '<meta name="twitter:title" content="Quarter Score">'
);
shell = shell.replace(
  /<meta name="twitter:description" content="[^"]*">/,
  '<meta name="twitter:description" content="Quarter Score">'
);

fs.writeFileSync(path.join(browserDir, 'spa.html'), shell);

const home = fs.readFileSync(indexPath, 'utf8');
const markers = ['The Ultimate', 'Football Squares'];
for (const marker of markers) {
  if (!home.includes(marker)) {
    console.error(`prepare-spa-shell: prerendered homepage is missing "${marker}".`);
    process.exit(1);
  }
}

console.log('Wrote dist/angular-squares/browser/spa.html for client routes.');
