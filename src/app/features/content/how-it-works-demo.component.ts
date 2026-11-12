import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NFL_TEAMS, getTeamLogo } from './teams-data';

interface DemoStep {
  /** Short label for the step bar. */
  short: string;
  title: string;
  text: string;
  /** The Next button's label on this step. */
  next: string;
}

interface DemoCell {
  key: string;
  name: string;
  initials: string;
  /** Player color class, or '' for an open square. */
  color: string;
  open: boolean;
  you: boolean;
  win: boolean;
  /** On the winning square's row or column while a quarter is shown. */
  cross: boolean;
  dim: boolean;
}

interface DemoQuarter {
  label: string;
  away: number;
  home: number;
  points: number;
}

const STEPS: DemoStep[] = [
  {
    short: 'Pick',
    title: 'Pick your square',
    text: 'Everyone opens the board’s link and taps an open square to claim it. Your name goes right on the board. Try it: tap any green square.',
    next: 'Lock and draw'
  },
  {
    short: 'Draw',
    title: 'Lock it and draw the numbers',
    text: 'When the board is full, the host locks it and QuarterScore draws 0 to 9 at random across the top and down the side. Nobody knows their numbers until now.',
    next: 'Play the game'
  },
  {
    short: 'Win',
    title: 'The score picks each winner',
    text: 'At the end of each quarter, take the last digit of each team’s score. The square where those two numbers meet wins that quarter’s points.',
    next: 'Play again'
  }
];

/** Digits before the draw is fixed to the picked square: across the top (Chiefs) and down the side (Cowboys). */
const BASE_COLS = [3, 8, 0, 7, 5, 1, 9, 4, 2, 6];
const BASE_ROWS = [6, 2, 9, 4, 0, 7, 3, 8, 1, 5];
/** The demo always deals your square Chiefs 7, Cowboys 4, so the first quarter is yours. */
const YOUR_HOME = 7;
const YOUR_AWAY = 4;
const DEFAULT_PICK = '3-3';
/** Running scores at the end of each quarter. Points follow the board's split: 20, 20, 20, 40 of 100. */
const QUARTERS: DemoQuarter[] = [
  { label: 'Q1', home: 17, away: 14, points: 20 },
  { label: 'Q2', home: 24, away: 21, points: 20 },
  { label: 'Q3', home: 31, away: 28, points: 20 },
  { label: 'Q4', home: 38, away: 35, points: 40 }
];
const PLAYERS: [string, string][] = [
  ['Sam', 'qs-p-sky'], ['Lee', 'qs-p-orchid'], ['Max', 'qs-p-rose'], ['Tom', 'qs-p-apricot'],
  ['Kim', 'qs-p-lilac'], ['Jo', 'qs-p-aqua'], ['Ana', 'qs-p-tan'], ['Bo', 'qs-p-periwinkle'],
  ['Cy', 'qs-p-coral'], ['Di', 'qs-p-sky']
];
/** Squares already claimed when you arrive; the rest fill in once the board locks. */
const EARLY = new Set(['0-1', '0-3', '0-6', '1-4', '1-8', '2-1', '2-4', '2-7', '3-0', '3-5', '4-2', '4-8', '5-2', '5-6', '5-9', '6-1', '6-4', '6-9', '7-3', '7-7', '8-0', '8-5', '8-7', '9-2', '9-8']);
const HOME_TEAM = NFL_TEAMS.find(t => t.abbreviation === 'KC')!;
const AWAY_TEAM = NFL_TEAMS.find(t => t.abbreviation === 'DAL')!;

/** Puts `digit` at `index`, swapping it with wherever it was, so every digit still appears once. */
function dealTo(base: number[], index: number, digit: number): number[] {
  const out = [...base];
  const from = out.indexOf(digit);
  [out[from], out[index]] = [out[index], out[from]];
  return out;
}

function playerAt(r: number, c: number): [string, string] {
  return PLAYERS[(r * 7 + c * 3) % PLAYERS.length];
}

/**
 * How to play, by doing: a sample game you play through in three steps. You claim a square on an open board,
 * the host locks it and the numbers are drawn, then each quarter's score lights up its winning square.
 * Plain signals and CSS motion, no timers, so it prerenders as step 1.
 */
@Component({
  selector: 'app-how-it-works-demo',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host { display: block; }
    .hiw-cell { transition: background-color var(--qs-t-state) var(--qs-ease-decel), opacity 160ms var(--qs-ease-decel), box-shadow var(--qs-t-state) var(--qs-ease-decel); }
    .hiw-cell.hiw-dim { opacity: .25; }
    .hiw-cell.hiw-cross { opacity: .6; }
    .hiw-open { background: color-mix(in srgb, var(--qs-accent) 14%, var(--qs-panel)); cursor: pointer; }
    @media (hover: hover) { .hiw-open:hover { background: color-mix(in srgb, var(--qs-accent) 30%, var(--qs-panel)); } }
    .hiw-open:active { transform: scale(.94); transition: transform var(--qs-t-press) var(--qs-ease-in); }
    .hiw-open:focus-visible { outline: 2px solid var(--qs-ink); outline-offset: -2px; }
    .hiw-you { box-shadow: inset 0 0 0 2px var(--qs-ink); }
    .hiw-win { background: var(--qs-win) !important; color: var(--qs-win-ink); animation: hiw-settle 300ms var(--qs-ease) both; position: relative; z-index: 1; }
    .hiw-claim { animation: hiw-claim var(--qs-t-state) var(--qs-ease-spring) both; }
    .hiw-axis { background: var(--qs-tile); color: var(--qs-tile-ink); transition: background-color var(--qs-t-state) var(--qs-ease-decel), color var(--qs-t-state) var(--qs-ease-decel); }
    .hiw-axis.hiw-lead { background: var(--qs-accent); color: var(--qs-on-accent); }
    .hiw-digit { animation: hiw-digit 300ms var(--qs-ease-decel) both; animation-delay: calc(var(--i) * 40ms); }
    .hiw-after-draw { animation: hiw-rise var(--qs-t-state) var(--qs-ease-decel) both; animation-delay: 1.1s; }
    .hiw-swap { animation: hiw-rise var(--qs-t-state) var(--qs-ease-decel) both; }
    .hiw-num { display: inline-block; animation: hiw-rise var(--qs-t-state) var(--qs-ease-decel) both; }
    .hiw-bar { transform-origin: left; transition: transform var(--qs-t-state) var(--qs-ease-decel); }
    @keyframes hiw-digit { from { opacity: 0; transform: translateY(4px); } }
    @keyframes hiw-rise { from { opacity: 0; transform: translateY(6px); } }
    @keyframes hiw-claim { from { opacity: 0; transform: scale(.85); } }
    @keyframes hiw-settle { 50% { transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) {
      .hiw-cell, .hiw-axis, .hiw-bar { transition: none; }
      .hiw-digit, .hiw-after-draw, .hiw-swap, .hiw-num, .hiw-claim, .hiw-win { animation: none; }
    }
  `],
  template: `
    <section class="qs-card overflow-hidden !p-0" aria-labelledby="hiw-heading">
      <h2 id="hiw-heading" class="sr-only">Play a sample game</h2>

      <!-- Step bar: three steps, each with a bar that fills as you reach it -->
      <ol class="grid grid-cols-3 border-b border-qs-line">
        @for (s of steps; track s.short; let i = $index) {
          <li class="min-w-0 border-l border-qs-line first:border-l-0">
            <button
              type="button"
              (click)="goTo(i)"
              [attr.aria-current]="i === step() ? 'step' : null"
              class="group relative flex w-full items-center gap-2.5 px-3 py-3.5 text-left transition-colors duration-150 hover:bg-qs-panel-2 sm:px-6 sm:py-4"
            >
              <span class="qs-label shrink-0" [class]="i <= step() ? 'text-qs-accent' : 'text-qs-muted'">0{{ i + 1 }}</span>
              <span class="truncate text-[15px] font-semibold sm:text-base" [class]="i === step() ? 'text-qs-ink' : 'text-qs-muted'">{{ s.short }}</span>
              <span class="absolute inset-x-0 bottom-0 h-[3px] bg-qs-accent hiw-bar" [style.transform]="i <= step() ? 'scaleX(1)' : 'scaleX(0)'" aria-hidden="true"></span>
            </button>
          </li>
        }
      </ol>

      <div class="grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <!-- The step's words -->
        <div class="px-5 pb-2 pt-6 sm:px-8 sm:pt-8 lg:col-start-1 lg:row-start-1 lg:pb-0" aria-live="polite">
          @for (s of [current()]; track s.title) {
            <div class="hiw-swap">
              <p class="qs-eyebrow qs-eyebrow-bar">Step {{ step() + 1 }} of 3</p>
              <h3 class="qs-title mt-4 text-[28px] text-qs-ink sm:text-[34px]">{{ s.title }}</h3>
              <p class="mt-3 text-[15px] leading-[1.6] text-qs-muted sm:text-base">{{ s.text }}</p>
            </div>
          }
        </div>

        <!-- The stage: a game card on the board canvas, like the game page -->
        <div class="qs-canvas !rounded-none border-y border-qs-line p-3 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-y-0 lg:border-l lg:p-8">
          <div class="mx-auto w-full max-w-[34rem] rounded-card border border-qs-line bg-qs-panel p-3 shadow-pop sm:p-5">
            <!-- Board name and state -->
            <div class="flex items-center justify-between gap-3">
              <p class="truncate text-[15px] font-semibold text-qs-ink sm:text-base">Sunday Night Squares</p>
              @for (b of [badge()]; track b.text) {
                <span class="qs-badge hiw-swap shrink-0" [class.qs-badge-ok]="b.ok">{{ b.text }}</span>
              }
            </div>

            <!-- Score: kickoff until the game starts, then the quarter on screen -->
            <div class="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-inner bg-qs-tile px-3 py-2.5 text-qs-tile-ink sm:px-4" aria-hidden="true">
              <div class="flex min-w-0 items-center gap-2">
                <img [src]="homeLogo" alt="" width="28" height="28" class="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7" />
                <span class="qs-label text-[12px] text-qs-tile-muted">KC</span>
                <b class="ml-auto font-mono text-2xl font-medium tabular-nums sm:text-[28px]">
                  @for (v of [score().home]; track v) { <span class="hiw-num">@if (scored()) {<span class="text-qs-tile-muted">{{ tens(v) }}</span><span class="text-qs-accent">{{ v % 10 }}</span>} @else {<span>{{ v }}</span>}</span> }
                </b>
              </div>
              <span class="qs-label px-1 text-[11.5px] text-qs-tile-muted">{{ scored() ? 'End ' + quarterLabel() : 'Kickoff' }}</span>
              <div class="flex min-w-0 items-center gap-2">
                <b class="font-mono text-2xl font-medium tabular-nums sm:text-[28px]">
                  @for (v of [score().away]; track v) { <span class="hiw-num">@if (scored()) {<span class="text-qs-tile-muted">{{ tens(v) }}</span><span class="text-qs-accent">{{ v % 10 }}</span>} @else {<span>{{ v }}</span>}</span> }
                </b>
                <span class="qs-label ml-auto text-[12px] text-qs-tile-muted">DAL</span>
                <img [src]="awayLogo" alt="" width="28" height="28" class="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7" />
              </div>
            </div>

            <!-- Axis caption, the same as the game page -->
            <p class="mb-2 mt-4 flex items-center gap-2 text-sm" aria-hidden="true">
              <span class="flex items-center gap-1 font-semibold text-qs-ink"><span class="text-base leading-none text-qs-muted">↓</span><img [src]="awayLogo" alt="" class="h-4 w-4 object-contain" />Cowboys</span>
              <span class="text-qs-line-strong">/</span>
              <span class="flex items-center gap-1 font-semibold text-qs-ink"><img [src]="homeLogo" alt="" class="h-4 w-4 object-contain" />Chiefs<span class="text-base leading-none text-qs-muted">→</span></span>
            </p>

            <!-- The board: 1px lines and gaps, navy number bars, like the real one -->
            <div role="group" [attr.aria-label]="boardLabel()" class="grid grid-cols-[1.5rem_repeat(10,minmax(0,1fr))] gap-px overflow-hidden rounded-inner bg-qs-line p-px sm:grid-cols-[2rem_repeat(10,minmax(0,1fr))]">
              <span class="bg-qs-panel-2"></span>
              @for (d of cols(); track $index; let c = $index) {
                <span class="hiw-axis grid h-6 place-items-center font-mono text-xs font-medium sm:h-8 sm:text-sm" [class.hiw-lead]="leadCol() === c" aria-hidden="true">
                  @if (drawn()) { <span class="hiw-digit" [style.--i]="c">{{ d }}</span> }
                </span>
              }
              @for (row of cells(); track $index; let r = $index) {
                <span class="hiw-axis grid place-items-center font-mono text-xs font-medium sm:text-sm" [class.hiw-lead]="leadRow() === r" aria-hidden="true">
                  @if (drawn()) { <span class="hiw-digit" [style.--i]="r + 10">{{ rows()[r] }}</span> }
                </span>
                @for (cell of row; track cell.key) {
                  @if (cell.open) {
                    <button
                      type="button"
                      class="hiw-cell hiw-open aspect-square"
                      [attr.aria-label]="'Claim square ' + (r + 1) + ', ' + ($index + 1)"
                      (click)="claim(cell.key)"
                    ></button>
                  } @else {
                    <span
                      class="hiw-cell grid aspect-square place-items-center overflow-hidden px-px text-center text-[9px] font-semibold leading-none text-slate-900 sm:text-[11px]"
                      [class]="cell.color"
                      [class.hiw-you]="cell.you"
                      [class.hiw-win]="cell.win"
                      [class.hiw-cross]="cell.cross"
                      [class.hiw-dim]="cell.dim"
                      aria-hidden="true"
                    ><span [class.hiw-claim]="cell.you && step() === 0"><span class="sm:hidden">{{ cell.initials }}</span><span class="hidden sm:inline">{{ cell.name }}</span></span></span>
                  }
                }
              }
            </div>

            <div class="qs-label mt-3 flex justify-between gap-3 text-[11.5px] text-qs-muted" aria-hidden="true">
              <span class="hidden sm:inline">10 × 10 · 100 squares</span>
              <span class="whitespace-nowrap max-sm:ml-auto">Points 20 · 20 · 20 · 40</span>
            </div>
          </div>
        </div>

        <!-- What the step means for you, then Back and Next -->
        <div class="flex flex-col gap-6 px-5 pb-6 pt-5 sm:px-8 sm:pb-8 lg:col-start-1 lg:row-start-2 lg:pt-6">
          @if (step() === 0) {
            <div class="hiw-swap rounded-inner border border-qs-line bg-qs-panel-2 p-4">
              <div class="flex items-baseline justify-between gap-3">
                <p class="qs-label text-qs-muted">Open squares</p>
                <p class="font-mono text-qs-ink"><b class="text-2xl font-medium text-qs-accent">{{ openCount() }}</b> <span class="ml-1 text-sm text-qs-muted">of 100</span></p>
              </div>
              <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-qs-muted">
                <li class="flex items-center gap-2"><span class="hiw-open h-3.5 w-3.5 rounded-[3px]" aria-hidden="true"></span>Open</li>
                <li class="flex items-center gap-2"><span class="qs-p-sky h-3.5 w-3.5 rounded-[3px]" aria-hidden="true"></span>Taken</li>
                <li class="flex items-center gap-2"><span class="qs-p-butter hiw-you h-3.5 w-3.5 rounded-[3px]" aria-hidden="true"></span>Yours</li>
              </ul>
              <p class="mt-3 border-t border-qs-line pt-3 text-sm text-qs-ink">{{ picked() ? 'That square is yours. Its numbers come in the draw.' : 'Tap a green square on the board to take it.' }}</p>
            </div>
          } @else if (step() === 1) {
            <div class="hiw-swap">
              <p class="qs-label text-qs-muted">Your numbers</p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div class="hiw-after-draw rounded-inner bg-qs-tile px-4 py-3">
                  <b class="font-mono text-[34px] font-medium leading-none text-qs-tile-ink">{{ yourHome }}</b>
                  <p class="qs-label mt-2 text-[11.5px] text-qs-tile-muted">Chiefs</p>
                </div>
                <div class="hiw-after-draw rounded-inner bg-qs-tile px-4 py-3">
                  <b class="font-mono text-[34px] font-medium leading-none text-qs-tile-ink">{{ yourAway }}</b>
                  <p class="qs-label mt-2 text-[11.5px] text-qs-tile-muted">Cowboys</p>
                </div>
              </div>
              <p class="mt-3 text-sm text-qs-muted">You win any quarter that ends with the Chiefs on a {{ yourHome }} and the Cowboys on a {{ yourAway }}, like 17 to 14.</p>
            </div>
          } @else {
            <div class="hiw-swap">
              <p class="qs-label text-qs-muted">Tap a quarter</p>
              <ul class="mt-3 divide-y divide-qs-line overflow-hidden rounded-inner border border-qs-line">
                @for (q of quarterRows(); track q.label; let i = $index) {
                  <li>
                    <button
                      type="button"
                      (click)="quarter.set(i)"
                      [attr.aria-pressed]="quarter() === i"
                      class="grid w-full grid-cols-[2.25rem_4.5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150"
                      [class]="quarter() === i ? 'bg-qs-ink text-qs-bg' : 'bg-qs-panel text-qs-ink hover:bg-qs-panel-2'"
                    >
                      <span class="qs-label">{{ q.label }}</span>
                      <span class="font-mono tabular-nums">{{ q.home }}–{{ q.away }}</span>
                      <span class="truncate font-semibold">{{ q.winner }}</span>
                      <span class="font-mono text-xs tabular-nums" [class]="quarter() === i ? 'opacity-70' : 'text-qs-muted'">{{ q.points }} pts</span>
                    </button>
                  </li>
                }
              </ul>
              <p class="mt-3 text-sm text-qs-muted">
                @if (quarter() === 0) { Chiefs 17, Cowboys 14: column 7 meets row 4. That's your square, so the first 20 points are yours. } @else { {{ quarterRows()[quarter()].home }} and {{ quarterRows()[quarter()].away }} end in {{ quarterRows()[quarter()].home % 10 }} and {{ quarterRows()[quarter()].away % 10 }}, so {{ quarterRows()[quarter()].winner }} takes {{ quarterRows()[quarter()].label }}. }
              </p>
            </div>
          }

          <div class="mt-auto flex items-center gap-2">
            @if (step() > 0) {
              <button type="button" class="qs-btn qs-btn-secondary" (click)="goTo(step() - 1)">Back</button>
            }
            <span class="flex-1"></span>
            <button type="button" class="qs-btn qs-btn-primary" (click)="next()">
              {{ current().next }}
              @if (step() < 2) { <span aria-hidden="true">→</span> }
            </button>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HowItWorksDemoComponent {
  public readonly awayLogo = getTeamLogo(AWAY_TEAM);
  public readonly homeLogo = getTeamLogo(HOME_TEAM);
  /** The square you claimed, or null until you tap one. */
  public readonly picked = signal<string | null>(null);
  public readonly quarter = signal(0);
  public readonly step = signal(0);
  public readonly steps = STEPS;
  public readonly yourAway = YOUR_AWAY;
  public readonly yourHome = YOUR_HOME;

  public readonly badge = computed(() => {
    const step = this.step();
    if (step === 0) return { ok: false, text: `${this.openCount()} open` };
    if (step === 1) return { ok: false, text: 'Locked' };
    return { ok: true, text: `${this.quarterLabel()} final` };
  });

  public readonly boardLabel = computed(() => {
    const step = this.step();
    if (step === 0) return `A sample 10 by 10 board with ${this.openCount()} open squares.`;
    if (step === 1) return `The board is locked and the numbers are drawn. Your square is Chiefs ${YOUR_HOME}, Cowboys ${YOUR_AWAY}.`;
    const q = this.quarterRows()[this.quarter()];
    return `End of ${q.label}: Chiefs ${q.home}, Cowboys ${q.away}. ${q.winner} wins ${q.points} points.`;
  });

  /** The board for the step on screen: some squares open at first, every square claimed once it locks. */
  public readonly cells = computed<DemoCell[][]>(() => {
    const step = this.step();
    const you = this.yourKey();
    const win = this.winKey();
    const [winRow, winCol] = win ? win.split('-').map(Number) : [-1, -1];
    return BASE_ROWS.map((_, r) => BASE_COLS.map((__, c) => {
      const key = `${r}-${c}`;
      const isYou = key === you && (step > 0 || this.picked() !== null);
      const claimed = isYou || step > 0 || EARLY.has(key);
      const [name, color] = isYou ? ['You', 'qs-p-butter'] : claimed ? playerAt(r, c) : ['', ''];
      const isWin = key === win;
      const cross = !!win && !isWin && (r === winRow || c === winCol);
      return { key, name, initials: isYou ? name : name.slice(0, 2), color, open: !claimed, you: isYou, win: isWin, cross, dim: !!win && !isWin && !cross };
    }));
  });

  /** Column digits, dealt so your column draws a 7. */
  public readonly cols = computed(() => dealTo(BASE_COLS, this.yourCol(), YOUR_HOME));
  public readonly current = computed(() => STEPS[this.step()]);
  public readonly drawn = computed(() => this.step() >= 1);
  public readonly leadCol = computed(() => (this.scored() ? this.cols().indexOf(this.score().home % 10) : -1));
  public readonly leadRow = computed(() => (this.scored() ? this.rows().indexOf(this.score().away % 10) : -1));
  public readonly openCount = computed(() => this.cells().flat().filter(c => c.open).length);
  public readonly quarterLabel = computed(() => QUARTERS[this.quarter()].label);

  /** Every quarter with its winner, for the list beside the board. */
  public readonly quarterRows = computed(() => QUARTERS.map(q => {
    const r = this.rows().indexOf(q.away % 10);
    const c = this.cols().indexOf(q.home % 10);
    const winner = `${r}-${c}` === this.yourKey() ? 'You' : playerAt(r, c)[0];
    return { ...q, winner };
  }));

  /** Row digits, dealt so your row draws a 4. */
  public readonly rows = computed(() => dealTo(BASE_ROWS, this.yourRow(), YOUR_AWAY));
  public readonly score = computed(() => (this.scored() ? QUARTERS[this.quarter()] : { home: 0, away: 0 }));
  public readonly scored = computed(() => this.step() === 2);

  public claim(key: string): void {
    if (this.step() !== 0 || this.picked()) return;
    this.picked.set(key);
  }

  public goTo(index: number): void {
    if (index > 0 && !this.picked()) this.picked.set(DEFAULT_PICK);
    if (index === 2 && this.step() !== 2) this.quarter.set(0);
    this.step.set(index);
  }

  public next(): void {
    if (this.step() === STEPS.length - 1) {
      this.picked.set(null);
      this.quarter.set(0);
      this.step.set(0);
      return;
    }
    this.goTo(this.step() + 1);
  }

  public tens(value: number): string {
    return value >= 10 ? String(Math.floor(value / 10)) : '';
  }

  private readonly winKey = computed(() => {
    if (!this.scored()) return null;
    return `${this.leadRow()}-${this.leadCol()}`;
  });
  private readonly yourCol = computed(() => Number(this.yourKey().split('-')[1]));
  private readonly yourKey = computed(() => this.picked() ?? DEFAULT_PICK);
  private readonly yourRow = computed(() => Number(this.yourKey().split('-')[0]));
}
