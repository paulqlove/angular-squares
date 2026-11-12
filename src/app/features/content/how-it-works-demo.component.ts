import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface DemoStep {
  /** Short label for the phone step strip. */
  short: string;
  title: string;
  text: string;
  /** What the board shows, in one line under it. */
  hint: string;
}

interface DemoCell {
  key: string;
  name: string;
  initials: string;
  /** Player color class, or '' for an open square. */
  color: string;
  you: boolean;
  win: boolean;
  dim: boolean;
}

const STEPS: DemoStep[] = [
  {
    short: 'Pick',
    title: 'Pick a square',
    text: 'Open squares are green. Tap one and type your name. Your friends do the same until the board fills.',
    hint: 'You picked a square. The numbers on the edges are still hidden.'
  },
  {
    short: 'Draw',
    title: 'Numbers get drawn',
    text: 'Once the board is full, the host locks it and 0 to 9 are shuffled across the top and down the side. Nobody picks their digits.',
    hint: 'Your square is now Chiefs 7, Cowboys 4.'
  },
  {
    short: 'Score',
    title: 'The score picks a winner',
    text: 'At the end of each quarter, take the last digit of each team’s score. Where that row and column meet wins the quarter.',
    hint: 'Chiefs 17, Cowboys 14: column 7 meets row 4. You win Q1.'
  }
];

/** Digits as they come out of the draw: across the top (Chiefs) and down the side (Cowboys). */
const COLS = [3, 8, 0, 7, 5, 1, 9, 4, 2, 6];
const ROWS = [6, 2, 9, 4, 0, 7, 3, 8, 1, 5];
/** Your square: row 4 (Cowboys) meets column 7 (Chiefs). */
const YOU = '3-3';
const PLAYERS: [string, string][] = [
  ['Sam', 'qs-p-sky'], ['Lee', 'qs-p-orchid'], ['Max', 'qs-p-rose'], ['Tom', 'qs-p-apricot'],
  ['Kim', 'qs-p-lilac'], ['Jo', 'qs-p-butter'], ['Ana', 'qs-p-aqua'], ['Bo', 'qs-p-tan'],
  ['Cy', 'qs-p-periwinkle'], ['Di', 'qs-p-coral']
];
/** Squares already claimed when you arrive; the rest fill in once the board is full. */
const EARLY = new Set(['0-1', '0-3', '0-6', '1-4', '1-8', '2-1', '2-4', '2-7', '3-0', '3-5', '4-2', '4-8', '5-2', '5-6', '5-9', '6-1', '6-4', '6-9', '7-3', '7-7', '8-0', '8-5', '8-7', '9-2', '9-8']);

/**
 * How to play, by doing: a small sample board you step through. Pick a square, the numbers get drawn,
 * then a quarter's score lights up the winning square. Plain signals, no timers, so it prerenders as step 1.
 */
@Component({
  selector: 'app-how-it-works-demo',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host { display: block; }
    .hiw-cell, .hiw-axis { transition: background-color var(--qs-t-state) var(--qs-ease-decel), color var(--qs-t-state) var(--qs-ease-decel), opacity var(--qs-t-state) var(--qs-ease-decel), box-shadow var(--qs-t-state) var(--qs-ease-decel); }
    .hiw-open { background: color-mix(in srgb, var(--qs-accent) 16%, var(--qs-panel)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--qs-accent) 32%, var(--qs-panel)); }
    .hiw-you { box-shadow: inset 0 0 0 2px var(--qs-ink); }
    .hiw-win { box-shadow: inset 0 0 0 3px var(--qs-accent); }
    .hiw-digit { animation: hiw-digit var(--qs-t-state) var(--qs-ease-decel) both; animation-delay: calc(var(--i) * 20ms); }
    @keyframes hiw-digit { from { opacity: 0; transform: translateY(4px); } }
    @media (prefers-reduced-motion: reduce) {
      .hiw-cell, .hiw-axis { transition: none; }
      .hiw-digit { animation: none; }
    }
  `],
  template: `
    <section class="qs-card grid overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)]" aria-labelledby="hiw-heading">
      <h2 id="hiw-heading" class="sr-only">Try it on a sample board</h2>

      <!-- Steps: a list with the open step's words on desktop, a strip of three on phones -->
      <ol class="flex gap-1 border-b border-qs-line p-2 lg:flex-col lg:gap-1.5 lg:border-b-0 lg:border-r lg:p-4">
        @for (s of steps; track s.title; let i = $index) {
          <li class="min-w-0 flex-1 lg:flex-none">
            <button
              type="button"
              (click)="step.set(i)"
              [attr.aria-current]="i === step() ? 'step' : null"
              class="grid w-full justify-items-center gap-1.5 rounded-inner border px-1.5 py-2.5 text-center transition-colors duration-150 lg:grid-cols-[2rem_minmax(0,1fr)] lg:justify-items-start lg:gap-3 lg:p-3.5 lg:text-left"
              [class]="i === step() ? 'border-qs-line bg-qs-panel-2' : 'border-transparent hover:bg-qs-panel-2'"
            >
              <span
                class="grid h-8 w-8 place-items-center rounded-full border font-mono text-sm"
                [class]="i === step() ? 'border-qs-ink bg-qs-ink text-qs-bg' : i < step() ? 'border-qs-ink text-qs-ink' : 'border-qs-line-strong text-qs-muted'"
                aria-hidden="true"
              >{{ i < step() ? '✓' : i + 1 }}</span>
              <span class="min-w-0">
                <span class="block text-[13px] font-semibold lg:hidden" [class]="i === step() ? 'text-qs-ink' : 'text-qs-muted'">{{ s.short }}</span>
                <span class="hidden pt-1 text-[17px] font-semibold leading-snug lg:block" [class]="i === step() ? 'text-qs-ink' : 'text-qs-muted'">{{ s.title }}</span>
                @if (i === step()) {
                  <span class="mt-1.5 hidden text-sm leading-[1.45] text-qs-muted lg:block">{{ s.text }}</span>
                }
              </span>
            </button>
          </li>
        }
      </ol>

      <div class="flex min-w-0 flex-col items-center gap-4 px-3.5 py-5 sm:px-7 sm:py-6">
        <div class="text-center lg:hidden" aria-live="polite">
          <p class="text-[17px] font-semibold text-qs-ink">{{ current().title }}</p>
          <p class="mt-1 text-[15px] leading-[1.45] text-qs-muted">{{ current().text }}</p>
        </div>

        <!-- Score tiles: kickoff once the numbers are drawn, then the end of Q1 -->
        <div class="flex min-h-16 items-stretch gap-2 sm:gap-2.5" aria-hidden="true">
          @if (step() === 0) {
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] text-qs-tile-muted sm:text-3xl">–</b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">KC</span></div>
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] text-qs-tile-muted sm:text-3xl">–</b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">DAL</span></div>
          } @else if (step() === 1) {
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-qs-tile-ink sm:text-3xl">0</b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">KC · start</span></div>
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-qs-tile-ink sm:text-3xl">0</b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">DAL · start</span></div>
          } @else if (step() === 2) {
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-qs-tile-muted sm:text-3xl">1<span class="text-qs-tile-ink">7</span></b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">KC · Q1</span></div>
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-qs-tile-muted sm:text-3xl">1<span class="text-qs-tile-ink">4</span></b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">DAL · Q1</span></div>
            <div class="flex min-w-20 flex-col justify-center rounded-inner bg-qs-tile-ok px-3 py-2 sm:px-4"><b class="text-[26px] font-semibold leading-none tracking-[-0.03em] text-qs-tile-ink sm:text-3xl">Q1</b><span class="qs-label mt-1.5 whitespace-nowrap text-[11.5px] text-qs-tile-muted">You win</span></div>
          }
        </div>

        <!-- The board: Chiefs across the top, Cowboys down the side -->
        <div class="w-full max-w-[30rem]">
          <p class="qs-label mb-2 pl-7 text-center text-[11.5px] text-qs-muted" aria-hidden="true">Chiefs · KC →</p>
          <div class="flex gap-1.5">
            <p class="qs-label text-center text-[11.5px] text-qs-muted [transform:rotate(180deg)] [writing-mode:vertical-rl]" aria-hidden="true">Cowboys · DAL →</p>
            <div role="img" [attr.aria-label]="boardLabel()" class="grid min-w-0 flex-1 grid-cols-[1.25rem_repeat(10,minmax(0,1fr))] gap-[2px] sm:grid-cols-[1.75rem_repeat(10,minmax(0,1fr))] sm:gap-[3px]">
              <span></span>
              @for (d of cols; track $index) {
                <span class="hiw-axis grid aspect-square place-items-center rounded-[3px] font-mono text-xs font-medium" [class]="axisClass(false, $index)">
                  @if (drawn()) { <span class="hiw-digit" [style.--i]="$index">{{ d }}</span> } @else { <span class="opacity-40">?</span> }
                </span>
              }
              @for (row of cells(); track $index; let r = $index) {
                <span class="hiw-axis grid place-items-center rounded-[3px] font-mono text-xs font-medium" [class]="axisClass(true, r)">
                  @if (drawn()) { <span class="hiw-digit" [style.--i]="r + 10">{{ rows[r] }}</span> } @else { <span class="opacity-40">?</span> }
                </span>
                @for (c of row; track c.key) {
                  <span
                    class="hiw-cell grid aspect-square place-items-center overflow-hidden rounded-[3px] text-[8px] font-semibold leading-none text-slate-900 sm:text-[10px]"
                    [class]="(c.color || 'hiw-open') + (c.you ? ' hiw-you' : '') + (c.win ? ' hiw-win' : '') + (c.dim ? ' opacity-[.35]' : '')"
                  ><span class="sm:hidden">{{ c.initials }}</span><span class="hidden sm:inline">{{ c.name }}</span></span>
                }
              }
            </div>
          </div>
        </div>

        <p class="min-h-5 text-center text-sm text-qs-muted" aria-live="polite">{{ current().hint }}</p>

        <div class="flex w-full max-w-[30rem] items-center gap-2">
          @if (step() > 0) {
            <button type="button" class="qs-btn qs-btn-secondary" (click)="step.set(step() - 1)">Back</button>
          }
          <span class="flex-1"></span>
          <button type="button" class="qs-btn qs-btn-primary" (click)="next()">{{ step() === steps.length - 1 ? 'Play again' : 'Next' }}</button>
        </div>
      </div>
    </section>
  `
})
export class HowItWorksDemoComponent {
  public readonly cols = COLS;
  public readonly rows = ROWS;
  public readonly step = signal(0);
  public readonly steps = STEPS;

  /** The board for the step on screen: open squares at first, every square claimed once the numbers are drawn. */
  public readonly cells = computed<DemoCell[][]>(() => {
    const step = this.step();
    const full = step >= 1;
    const scored = step === 2;
    return ROWS.map((_, r) => COLS.map((__, c) => {
      const key = `${r}-${c}`;
      const you = key === YOU;
      const claimed = you || full || EARLY.has(key);
      const [name, color] = you ? ['You', 'qs-p-butter'] : claimed ? PLAYERS[(r * 7 + c * 3) % PLAYERS.length] : ['', ''];
      return { key, name, initials: you ? name : name.slice(0, 2), color, you, win: scored && you, dim: scored && !you };
    }));
  });

  public readonly current = computed(() => STEPS[this.step()]);
  public readonly drawn = computed(() => this.step() >= 1);

  public readonly boardLabel = computed(() => [
    'A sample 10 by 10 board.',
    this.drawn() ? 'The numbers are drawn.' : 'The numbers are not drawn yet.',
    this.current().hint
  ].join(' '));

  /** The row and column that meet on the winning square light up once the score is in. */
  public axisClass(row: boolean, index: number): string {
    const hot = this.step() === 2 && index === 3;
    return hot ? 'bg-qs-ink text-qs-bg font-semibold' : 'bg-qs-tile text-qs-tile-muted';
  }

  public next(): void {
    this.step.set(this.step() === STEPS.length - 1 ? 0 : this.step() + 1);
  }
}
