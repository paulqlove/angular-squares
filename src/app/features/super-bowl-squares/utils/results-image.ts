import { ResultsSummary } from './results';

/**
 * Draws the results card as a 1080 by 1080 PNG for sharing: the dark score header, the Winners list and a footer with
 * the QuarterScore lockup, on the page's paper background. Colors are the light theme's, so the image looks the same
 * whatever theme the sharer uses. Browser only.
 */
export async function drawResultsImage(summary: ResultsSummary): Promise<Blob> {
  await Promise.all([loadFonts(), loadLogo()]).then(([, logo]) => { cachedLogo = logo; });
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  paint(ctx, summary, cachedLogo);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'));
}

const SIZE = 1080;
const CARD = { x: 76, y: 173, w: 928, h: 734, r: 14 };
const PAD = 33;
const HEADER_H = 194;
const ROW_H = 100;
const C = {
  page: '#f6f3ee',
  panel: '#fffefc',
  line: '#e4dfd6',
  ink: '#0f172a',
  muted: '#5b6070',
  tile: '#0f172a',
  tileInk: '#f3efe8',
  tileMuted: '#94a3b8',
  win: '#34d399',
  winInk: '#0f172a',
  empty: '#c7c1b6'
};
const SANS = '"Space Grotesk", "Segoe UI", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

let cachedLogo: HTMLImageElement | null = null;

function paint(ctx: CanvasRenderingContext2D, s: ResultsSummary, logo: HTMLImageElement | null): void {
  const left = CARD.x + PAD;
  const right = CARD.x + CARD.w - PAD;
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Card with a soft shadow, then the dark header clipped to the card's rounded top
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.clip();
  ctx.fillStyle = C.tile;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, HEADER_H);
  ctx.restore();
  roundRect(ctx, CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1, CARD.r);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header: FINAL · title and the date, then AWAY team, the score, HOME team
  const date = s.date;
  label(ctx, date, right, CARD.y + 49, C.tileMuted, 'right', 20, '500');
  const dateW = date ? measure(ctx, date, `500 20px ${MONO}`, 3) + 24 : 0;
  label(ctx, `FINAL · ${s.title.toUpperCase()}`, left, CARD.y + 49, C.tileMuted, 'left', 20, '500', right - left - dateW);

  const scoreY = CARD.y + 149;
  const scoreParts: Part[] = [
    { text: String(s.away), color: C.tileInk },
    { text: ' – ', color: C.tileMuted },
    { text: String(s.home), color: C.tileInk }
  ];
  const scoreFont = `600 92px ${SANS}`;
  const scoreW = partsWidth(ctx, scoreParts, scoreFont);
  drawParts(ctx, scoreParts, scoreFont, SIZE / 2 - scoreW / 2, scoreY);
  const teamMax = SIZE / 2 - scoreW / 2 - left - 24;
  label(ctx, 'AWAY', left, CARD.y + 109, C.tileMuted, 'left', 20, '500');
  text(ctx, s.awayTeam, left, scoreY, `600 30px ${SANS}`, C.tileInk, 'left', teamMax);
  label(ctx, 'HOME', right, CARD.y + 109, C.tileMuted, 'right', 20, '500');
  text(ctx, s.homeTeam, right, scoreY, `600 30px ${SANS}`, C.tileInk, 'right', teamMax);

  // Winners
  const listTop = CARD.y + HEADER_H;
  label(ctx, 'WINNERS', left, listTop + 40, C.ink, 'left', 20, '500');
  label(ctx, 'SCORE', right, listTop + 40, C.muted, 'right', 20, '500');
  line(ctx, left, right, listTop + 55);
  s.rows.forEach((row, i) => {
    const top = listTop + 56 + i * ROW_H;
    const cy = top + ROW_H / 2;
    if (i > 0) line(ctx, left, right, top);
    label(ctx, row.label, left, cy + 7, C.muted, 'left', 20, '400');
    const bx = left + 132;
    roundRect(ctx, bx, cy - 27, 54, 54, 6);
    if (row.name) {
      ctx.fillStyle = C.win;
      ctx.fill();
      text(ctx, row.initials, bx + 27, cy + 6, `600 18px ${MONO}`, C.winInk, 'center', 50);
    } else {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = C.empty;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const scoreParts: Part[] = row.score
      ? [{ text: String(row.score.away), color: C.ink }, { text: ' – ', color: C.muted }, { text: String(row.score.home), color: C.ink }]
      : [{ text: '–', color: C.muted }];
    const rowFont = `600 30px ${SANS}`;
    const rowW = partsWidth(ctx, scoreParts, rowFont);
    drawParts(ctx, scoreParts, rowFont, right - rowW, cy + 11);
    const nameX = bx + 72;
    const nameMax = right - rowW - 32 - nameX;
    text(ctx, row.name ?? 'Empty square', nameX, cy - 5, `500 24px ${SANS}`, row.name ? C.ink : C.muted, 'left', nameMax);
    if (row.square) text(ctx, row.square, nameX, cy + 27, `400 19px ${MONO}`, C.muted, 'left', nameMax);
  });

  // Footer: the lockup and the address
  const footTop = CARD.y + CARD.h - 85;
  line(ctx, CARD.x, CARD.x + CARD.w, footTop);
  if (logo) {
    const h = 36;
    ctx.drawImage(logo, left, footTop + 24, (h * logo.naturalWidth) / logo.naturalHeight || h * 8, h);
  } else {
    text(ctx, 'QuarterScore', left, footTop + 54, `600 36px ${SANS}`, C.ink, 'left', 400);
  }
  label(ctx, 'QUARTERSCORE.COM', right, footTop + 49, C.muted, 'right', 20, '500');
}

type Part = { text: string; color: string };

function drawParts(ctx: CanvasRenderingContext2D, parts: Part[], font: string, x: number, y: number): void {
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const part of parts) {
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, x, y);
    x += ctx.measureText(part.text).width;
  }
}

function partsWidth(ctx: CanvasRenderingContext2D, parts: Part[], font: string): number {
  ctx.font = font;
  return parts.reduce((w, p) => w + ctx.measureText(p.text).width, 0);
}

/** Mono caps with the site's letter spacing. */
function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, align: CanvasTextAlign, size: number, weight: string, max = 900): void {
  setSpacing(ctx, '3px');
  // Spacing adds a gap after the last letter, so right-aligned labels shift right by one gap to line up with the edge
  text(ctx, value, align === 'right' ? x + 3 : x, y, `${weight} ${size}px ${MONO}`, color, align, max);
  setSpacing(ctx, '0px');
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, max: number): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fit(ctx, value, max), x, y);
}

/** Cuts text to the width with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, value: string, max: number): string {
  if (ctx.measureText(value).width <= max) return value;
  let cut = value;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function measure(ctx: CanvasRenderingContext2D, value: string, font: string, spacing: number): number {
  ctx.font = font;
  return ctx.measureText(value).width + spacing * value.length;
}

function setSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
}

function line(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number): void {
  ctx.fillStyle = C.line;
  ctx.fillRect(x1, y, x2 - x1, 1);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(
    [`600 92px ${SANS}`, `500 24px ${SANS}`, `500 20px ${MONO}`, `400 20px ${MONO}`, `600 18px ${MONO}`].map(f => document.fonts.load(f).catch(() => []))
  );
  await document.fonts.ready;
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const img = new Image();
    img.src = '/assets/brand/lockup-horizontal.svg';
    await img.decode();
    return img;
  } catch {
    return null;
  }
}
