/**
 * Scroll-grow board cards on the dashboard.
 *
 * Every card is compact except the row on the focus line (45% down the window), which opens to the full card.
 * Row heights always add up to one open row, so the page never changes length while you scroll.
 * A card morphs in two parts so the words never cross the navy tile: the tile grows down and the words drop below it
 * (`v`, the row's share of the height), and only then does the tile widen and the words slide left under it (`h`).
 * Closing runs the other way: the tile narrows first, then the row shrinks.
 * Reduced motion holds still: the first row is open, the rest compact.
 *
 * Cards are found by `[data-grow]` inside the root; their parts by `[data-g="hero" | "mini" | ...]`.
 * Only heights, transforms, opacity and a clip change.
 */

/** Card heights (compact and full), where the action bar sits in each, and the compact thumbnail. */
export const GROW = { C: 128, F: 240, FOOT_C: 88, FOOT_F: 200, THUMB: 52, MINI: 72 } as const;

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;
const smooth = (x: number): number => x * x * (3 - 2 * x);

interface Weight {
  /** Down: the row's share of the extra height, 0 to 1. Rows add up to 1. */
  v: number;
  /** Across: the tile widening, 0 to 1. */
  h: number;
}

interface Row {
  cards: HTMLElement[];
  top: number;
  widths: number[];
}

export class ScrollGrow {
  private destroyed = false;
  private mo: MutationObserver;
  private painted = new WeakMap<HTMLElement, string>();
  private raf = 0;
  private reduced: MediaQueryList;
  private weights = new WeakMap<HTMLElement, number>();

  constructor(private root: HTMLElement) {
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // The browser's scroll anchoring would chase the growing rows and fight the scroll
    document.documentElement.style.overflowAnchor = 'none';
    addEventListener('scroll', this.schedule, { passive: true });
    addEventListener('resize', this.resize);
    this.reduced.addEventListener('change', this.resize);
    this.mo = new MutationObserver(this.schedule);
    this.mo.observe(root, { childList: true, subtree: true });
    this.schedule();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    removeEventListener('scroll', this.schedule);
    removeEventListener('resize', this.resize);
    this.reduced.removeEventListener('change', this.resize);
    this.mo.disconnect();
    document.documentElement.style.overflowAnchor = '';
  }

  private frame = (): void => {
    this.raf = 0;
    if (this.destroyed) return;
    const rows = this.readRows();
    if (!rows.length) return;
    const weights: Weight[] = this.reduced.matches ? rows.map((_, k) => ({ v: k === 0 ? 1 : 0, h: k === 0 ? 1 : 0 })) : this.weightsFor(rows);
    rows.forEach((row, k) => row.cards.forEach((card, i) => this.paint(card, weights[k], row.widths[i])));
  };

  /** Groups the cards into rows by their top edge, top to bottom. */
  private readRows(): Row[] {
    const rows: Row[] = [];
    for (const card of Array.from(this.root.querySelectorAll<HTMLElement>('[data-grow]'))) {
      const r = card.getBoundingClientRect();
      if (!r.width) continue;
      const row = rows.find(x => Math.abs(x.top - r.top) < 2);
      if (row) {
        row.cards.push(card);
        row.widths.push(r.width);
      } else {
        rows.push({ cards: [card], top: r.top, widths: [r.width] });
      }
    }
    return rows.sort((a, b) => a.top - b.top);
  }

  private resize = (): void => {
    this.painted = new WeakMap();
    this.schedule();
  };

  private schedule = (): void => {
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(this.frame);
  };

  /**
   * One row at a time is open, picked by where the focus line falls.
   * Row positions are taken as if every card were compact, so the answer doesn't depend on which row is open now.
   */
  private weightsFor(rows: Row[]): Weight[] {
    const { C, F } = GROW;
    let extraAbove = 0;
    const anchors = rows.map(row => {
      const compactTop = row.top + scrollY - extraAbove;
      extraAbove += (F - C) * (this.weights.get(row.cards[0]) ?? 0);
      return compactTop + F / 2;
    });
    const focus = scrollY + innerHeight * 0.45;
    const w: Weight[] = rows.map(() => ({ v: 0, h: 0 }));
    const last = rows.length - 1;
    if (focus <= anchors[0]) w[0] = { v: 1, h: 1 };
    else if (focus >= anchors[last]) w[last] = { v: 1, h: 1 };
    else {
      let k = 0;
      while (k < last && focus >= anchors[k + 1]) k++;
      const f = (focus - anchors[k]) / (anchors[k + 1] - anchors[k]);
      // Height hands over while the line crosses the middle of the gap between rows. The row above narrows first,
      // the row below widens last, so a tile only changes width while its words are clear of it.
      const e = smooth(clamp((f - 0.3) / 0.4));
      w[k] = { v: 1 - e, h: 1 - smooth(clamp((f - 0.1) / 0.3)) };
      w[k + 1] = { v: e, h: smooth(clamp((f - 0.6) / 0.3)) };
    }
    return w;
  }

  /** Draws one card: v and h at 0 is compact, both at 1 is full. */
  private paint(card: HTMLElement, { v, h }: Weight, W: number): void {
    this.weights.set(card, v);
    const key = `${v.toFixed(4)}|${h.toFixed(4)}|${Math.round(W)}`;
    if (this.painted.get(card) === key) return;
    this.painted.set(card, key);

    const { C, F, FOOT_C, FOOT_F, THUMB, MINI } = GROW;
    const part = (name: string): HTMLElement | null => card.querySelector<HTMLElement>(`[data-g="${name}"]`);
    card.style.height = `${lerp(C, F, v)}px`;
    card.classList.toggle('g-open', h > 0.5);

    // Navy tile: a full-size hero clipped down to the thumbnail
    const hero = part('hero');
    if (hero) {
      const hw = W - 16;
      hero.style.width = `${hw}px`;
      hero.style.clipPath = `inset(${lerp(2, 0, v)}px ${lerp(hw - THUMB - 2, 0, h)}px ${lerp(100 - THUMB - 2, 0, v)}px ${lerp(2, 0, h)}px round ${lerp(6, 8, h)}px)`;
    }
    const mini = part('mini');
    if (mini) mini.style.transform = `translate(${lerp(7, 14, v)}px, ${lerp(7, 14, v)}px) scale(${lerp((THUMB - 10) / MINI, 1, v)})`;
    const count = part('count');
    if (count) {
      count.style.opacity = `${h}`;
      count.style.transform = `translateX(${lerp(-10, 0, h)}px)`;
    }
    const label = part('label');
    if (label) label.style.opacity = `${1 - clamp(v / 0.35)}`;

    // Words: drop below the tile, then slide left under it
    const ts = lerp(15 / 18, 1, v);
    const tx = lerp(74, 14, h);
    const title = part('title');
    if (title) {
      title.style.transform = `translate(${tx}px, ${lerp(12, 118, v)}px) scale(${ts})`;
      title.style.width = `${(W - tx - lerp(48, 14, h)) / ts}px`;
    }
    const teams = part('teams');
    if (teams) {
      teams.style.transform = `translate(${tx}px, ${lerp(38, 150, v)}px)`;
      teams.style.width = `${W - tx - 14}px`;
    }
    const foot = part('foot');
    if (foot) foot.style.transform = `translateY(${lerp(FOOT_C, FOOT_F, v)}px)`;

    // The menu: beside the name while compact, in the tile's corner once open
    const more = part('more');
    if (more) more.style.transform = `translate(${lerp(0, -8, h)}px, ${lerp(2, 8, h)}px)`;
  }
}
