import { ResultRow, ResultsSummary } from './results';

/**
 * Draws the winners picture as a 1080 by 1080 PNG for Share winners: the dark score header, the Winners list and a
 * footer with the QuarterScore lockup and the quarterscore.com wordmark, on the page's paper background. Colors are
 * the light theme's, so the picture looks the same whatever theme the sharer uses. Browser only.
 */
export async function drawResultsImage(summary: ResultsSummary): Promise<Blob> {
  const [, logo] = await Promise.all([loadFonts(), loadLogo()]);
  cachedLogo = logo;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  paintCard(ctx);
  paintHeader(ctx, summary);
  paintWinners(ctx, summary.rows);
  paintFooter(ctx, logo);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'));
}

const SIZE = 1080;
const CARD = { x: 76, y: 173, w: 928, h: 734, r: 14 };
const PAD = 33;
const LEFT = CARD.x + PAD;
const RIGHT = CARD.x + CARD.w - PAD;
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

type Point = { x: number; y: number };
type Part = { text: string; color: string };
interface TextStyle {
  font: string;
  color: string;
  align: CanvasTextAlign;
  max: number;
}
interface LabelStyle {
  color: string;
  align: CanvasTextAlign;
  size: number;
  weight: string;
  max?: number;
}

/** Paper background, then the card with a soft shadow, its dark header clipped to the rounded top, and a hairline. */
function paintCard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, { x: CARD.x, y: CARD.y }, { x: CARD.w, y: CARD.h }, CARD.r);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, { x: CARD.x, y: CARD.y }, { x: CARD.w, y: CARD.h }, CARD.r);
  ctx.clip();
  ctx.fillStyle = C.tile;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, HEADER_H);
  ctx.restore();
  roundRect(ctx, { x: CARD.x + 0.5, y: CARD.y + 0.5 }, { x: CARD.w - 1, y: CARD.h - 1 }, CARD.r);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** FINAL · title and the date, then AWAY team, the score, HOME team. */
function paintHeader(ctx: CanvasRenderingContext2D, s: ResultsSummary): void {
  const muted: LabelStyle = { color: C.tileMuted, align: 'left', size: 20, weight: '500' };
  label(ctx, s.date, { x: RIGHT, y: CARD.y + 49 }, { ...muted, align: 'right' });
  const dateW = s.date ? measure(ctx, s.date, `500 20px ${MONO}`, 3) + 24 : 0;
  label(ctx, `FINAL · ${s.title.toUpperCase()}`, { x: LEFT, y: CARD.y + 49 }, { ...muted, max: RIGHT - LEFT - dateW });

  const scoreY = CARD.y + 149;
  const scoreParts = scoreText(s.away, s.home, C.tileInk, C.tileMuted);
  const scoreFont = `600 92px ${SANS}`;
  const scoreW = partsWidth(ctx, scoreParts, scoreFont);
  drawParts(ctx, scoreParts, scoreFont, { x: SIZE / 2 - scoreW / 2, y: scoreY });
  const team: Omit<TextStyle, 'align'> = { font: `600 30px ${SANS}`, color: C.tileInk, max: SIZE / 2 - scoreW / 2 - LEFT - 24 };
  label(ctx, 'AWAY', { x: LEFT, y: CARD.y + 109 }, muted);
  text(ctx, s.awayTeam, { x: LEFT, y: scoreY }, { ...team, align: 'left' });
  label(ctx, 'HOME', { x: RIGHT, y: CARD.y + 109 }, { ...muted, align: 'right' });
  text(ctx, s.homeTeam, { x: RIGHT, y: scoreY }, { ...team, align: 'right' });
}

/** The WINNERS and SCORE headings, then one row per quarter. */
function paintWinners(ctx: CanvasRenderingContext2D, rows: ResultRow[]): void {
  const listTop = CARD.y + HEADER_H;
  label(ctx, 'WINNERS', { x: LEFT, y: listTop + 40 }, { color: C.ink, align: 'left', size: 20, weight: '500' });
  label(ctx, 'SCORE', { x: RIGHT, y: listTop + 40 }, { color: C.muted, align: 'right', size: 20, weight: '500' });
  line(ctx, LEFT, RIGHT, listTop + 55);
  rows.forEach((row, i) => {
    const top = listTop + 56 + i * ROW_H;
    if (i > 0) line(ctx, LEFT, RIGHT, top);
    paintRow(ctx, row, top + ROW_H / 2);
  });
}

/** The quarter, the winner's badge (dashed when the square was empty), name and square, and the score on the right. */
function paintRow(ctx: CanvasRenderingContext2D, row: ResultRow, cy: number): void {
  label(ctx, row.label, { x: LEFT, y: cy + 7 }, { color: C.muted, align: 'left', size: 20, weight: '400' });
  const bx = LEFT + 132;
  roundRect(ctx, { x: bx, y: cy - 27 }, { x: 54, y: 54 }, 6);
  if (row.name) {
    ctx.fillStyle = C.win;
    ctx.fill();
    text(ctx, row.initials, { x: bx + 27, y: cy + 6 }, { font: `600 18px ${MONO}`, color: C.winInk, align: 'center', max: 50 });
  } else {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.empty;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const scoreParts: Part[] = row.score ? scoreText(row.score.away, row.score.home, C.ink, C.muted) : [{ text: '–', color: C.muted }];
  const rowFont = `600 30px ${SANS}`;
  const rowW = partsWidth(ctx, scoreParts, rowFont);
  drawParts(ctx, scoreParts, rowFont, { x: RIGHT - rowW, y: cy + 11 });
  const nameX = bx + 72;
  const max = RIGHT - rowW - 32 - nameX;
  text(ctx, row.name ?? 'Empty square', { x: nameX, y: cy - 5 }, { font: `500 24px ${SANS}`, color: row.name ? C.ink : C.muted, align: 'left', max });
  if (row.square) text(ctx, row.square, { x: nameX, y: cy + 27 }, { font: `400 19px ${MONO}`, color: C.muted, align: 'left', max });
}

/** The lockup, then the quarterscore.com wordmark 20px to its right in small muted mono, on the lockup's middle. */
function paintFooter(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null): void {
  const footTop = CARD.y + CARD.h - 85;
  line(ctx, CARD.x, CARD.x + CARD.w, footTop);
  const h = 36;
  let logoW: number;
  if (logo) {
    logoW = (h * logo.naturalWidth) / logo.naturalHeight || h * 8;
    ctx.drawImage(logo, LEFT, footTop + 24, logoW, h);
  } else {
    const font = `600 36px ${SANS}`;
    ctx.font = font;
    logoW = Math.min(400, ctx.measureText('QuarterScore').width);
    text(ctx, 'QuarterScore', { x: LEFT, y: footTop + 54 }, { font, color: C.ink, align: 'left', max: 400 });
  }
  text(ctx, 'quarterscore.com', { x: LEFT + logoW + 20, y: footTop + 48 }, { font: `500 18px ${MONO}`, color: C.muted, align: 'left', max: 300 });
}

function scoreText(away: number, home: number, ink: string, muted: string): Part[] {
  return [
    { text: String(away), color: ink },
    { text: ' – ', color: muted },
    { text: String(home), color: ink }
  ];
}

function drawParts(ctx: CanvasRenderingContext2D, parts: Part[], font: string, at: Point): void {
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let x = at.x;
  for (const part of parts) {
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, x, at.y);
    x += ctx.measureText(part.text).width;
  }
}

function partsWidth(ctx: CanvasRenderingContext2D, parts: Part[], font: string): number {
  ctx.font = font;
  return parts.reduce((w, p) => w + ctx.measureText(p.text).width, 0);
}

/** Mono caps with the site's letter spacing. */
function label(ctx: CanvasRenderingContext2D, value: string, at: Point, style: LabelStyle): void {
  setSpacing(ctx, '3px');
  // Spacing adds a gap after the last letter, so right-aligned labels shift right by one gap to line up with the edge
  const x = style.align === 'right' ? at.x + 3 : at.x;
  text(ctx, value, { x, y: at.y }, { font: `${style.weight} ${style.size}px ${MONO}`, color: style.color, align: style.align, max: style.max ?? 900 });
  setSpacing(ctx, '0px');
}

function text(ctx: CanvasRenderingContext2D, value: string, at: Point, style: TextStyle): void {
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fit(ctx, value, style.max), at.x, at.y);
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

/** A rounded rectangle path at `at`, `size.x` wide and `size.y` tall. */
function roundRect(ctx: CanvasRenderingContext2D, at: Point, size: Point, r: number): void {
  const { x, y } = at;
  const w = size.x;
  const h = size.y;
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
    [`600 92px ${SANS}`, `500 24px ${SANS}`, `500 20px ${MONO}`, `400 20px ${MONO}`, `600 18px ${MONO}`, `500 18px ${MONO}`].map(f =>
      document.fonts.load(f).catch(() => [])
    )
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
