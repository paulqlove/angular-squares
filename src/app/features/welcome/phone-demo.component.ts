import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

interface DemoPlayer {
  initials: string;
  color: string;
}

type Phase = 'filling' | 'drawing' | 'locked';

const PLAYERS: DemoPlayer[] = [
  { initials: 'AL', color: 'bg-red-200' },
  { initials: 'SA', color: 'bg-blue-200' },
  { initials: 'JO', color: 'bg-amber-200' },
  { initials: 'MI', color: 'bg-teal-200' },
  { initials: 'LE', color: 'bg-pink-200' },
  { initials: 'CA', color: 'bg-orange-200' },
  { initials: 'RI', color: 'bg-lime-200' },
  { initials: 'NI', color: 'bg-fuchsia-200' },
  { initials: 'MA', color: 'bg-green-200' },
  { initials: 'PA', color: 'bg-purple-200' }
];

const FILL_STEP_MS = 35;
const FLICKER_MS = 70;
const LOCK_STEP_MS = 180;

/**
 * Animated hero illustration: a phone showing squares being claimed,
 * then the axis numbers drawn one by one. Static, not connected to Firebase.
 */
@Component({
  selector: 'app-phone-demo',
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="phone mx-auto" role="img" aria-label="A phone showing football squares filling up with players, then the numbers being drawn">
      <div class="phone-screen" aria-hidden="true">
        <div class="hidden sm:flex items-center justify-center bg-qs-tile pt-7 pb-3">
          <img src="assets/brand/lockup-horizontal-reversed.svg" alt="" width="128" height="16" class="h-4 w-auto">
        </div>

        <div class="p-3 sm:p-3.5">
          <div class="mb-3 flex items-center justify-between gap-2">
            <p class="qs-eyebrow qs-eyebrow-bar text-[10px]">Harbor vs Riverside</p>
            @switch (phase()) {
              @case ('filling') { <span class="qs-badge qs-badge-warn">{{ claimedCount() }} / 100</span> }
              @case ('drawing') { <span class="qs-badge">Drawing</span> }
              @case ('locked') { <span class="qs-badge qs-badge-ok">Locked</span> }
            }
          </div>

          <div class="qs-canvas p-2">
            <div class="grid grid-cols-[0.9rem_repeat(10,minmax(0,1fr))] gap-px overflow-hidden rounded-chip bg-qs-line p-px">
              <div class="bg-qs-panel-2"></div>
              @for (digit of home(); track $index) {
                <div class="axis" [class.axis-locked]="homeLocked()[$index]">{{ digit ?? '' }}</div>
              }
              @for (row of rows; track row) {
                <div class="axis" [class.axis-locked]="awayLocked()[row]">{{ away()[row] ?? '' }}</div>
                @for (col of rows; track col) {
                  @if (claims()[row * 10 + col]; as player) {
                    <div class="square square-claimed" [class]="player.color">{{ player.initials }}</div>
                  } @else {
                    <div class="square bg-qs-panel"></div>
                  }
                }
              }
            </div>
          </div>

          <p class="qs-label mt-3 text-center text-qs-muted">
            @switch (phase()) {
              @case ('filling') { Squares filling up }
              @case ('drawing') { Drawing numbers }
              @case ('locked') { Numbers locked. Game on. }
            }
          </p>

          <div class="mt-4 grid grid-cols-4 gap-1.5">
            @for (quarter of quarters; track quarter) {
              <div class="rounded-inner bg-qs-tile px-1 py-2 text-center">
                <p class="text-lg font-semibold leading-none text-qs-tile-ink">–</p>
                <p class="qs-label mt-1.5 text-[9px] text-qs-tile-muted">{{ quarter }}</p>
              </div>
            }
          </div>
        </div>
        <div class="hidden sm:block mx-auto mb-2 mt-auto h-1 w-24 rounded-full bg-qs-line-strong"></div>
      </div>
    </div>
  `,
  styles: [`
    .phone { max-width: 320px; }
    @media (min-width: 640px) {
      .phone {
        border: 10px solid var(--qs-tile);
        border-radius: 44px;
        box-shadow: var(--qs-shadow-pop);
        position: relative;
        background: var(--qs-tile);
      }
      .phone::before {
        content: "";
        position: absolute;
        top: 8px;
        left: 50%;
        width: 84px;
        height: 18px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: #000;
        z-index: 1;
      }
      .phone-screen {
        border-radius: 34px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 560px;
      }
    }
    .phone-screen { background: var(--qs-bg); }
    @media (max-width: 639px) {
      .phone { max-width: none; }
      .phone-screen {
        border: 1px solid var(--qs-line);
        border-radius: var(--qs-r-card);
        background: var(--qs-panel);
        box-shadow: var(--qs-shadow);
      }
    }
    .axis {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0.9rem;
      background: var(--qs-tile);
      color: var(--qs-tile-muted);
      font-family: var(--qs-font-mono);
      font-size: 9px;
      font-weight: 500;
      transition: color var(--qs-t-fast) var(--qs-ease);
    }
    .axis-locked { color: var(--qs-tile-ink); }
    .square {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
      line-height: 1;
      color: #0f172a;
    }
    .square-claimed { animation: claim-in var(--qs-t-state) var(--qs-ease); }
    @keyframes claim-in {
      from { opacity: 0; transform: scale(.6); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class PhoneDemoComponent {
  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.showFinal();
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          this.loop(++this.run);
        } else {
          this.run++;
        }
      });
      observer.observe(host.nativeElement);
      destroyRef.onDestroy(() => {
        this.run++;
        observer.disconnect();
      });
    });
  }
  public away = signal<(number | null)[]>(Array(10).fill(null));
  public awayLocked = signal<boolean[]>(Array(10).fill(false));
  public claimedCount = signal<number>(0);
  public claims = signal<(DemoPlayer | null)[]>(Array(100).fill(null));
  public home = signal<(number | null)[]>(Array(10).fill(null));
  public homeLocked = signal<boolean[]>(Array(10).fill(false));
  public phase = signal<Phase>('filling');
  public readonly quarters: string[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  public readonly rows: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  private run: number = 0;

  /** Flicker every unlocked axis cell, then lock the top row left to right and the side column top to bottom. */
  private async draw(run: number): Promise<boolean> {
    const finalHome = shuffle([...Array(10).keys()]);
    const finalAway = shuffle([...Array(10).keys()]);
    const flicker = setInterval(() => {
      this.home.update(d => d.map((v, i) => (this.homeLocked()[i] ? v : randomDigit())));
      this.away.update(d => d.map((v, i) => (this.awayLocked()[i] ? v : randomDigit())));
    }, FLICKER_MS);

    try {
      if (!(await this.wait(600, run))) return false;
      for (let i = 0; i < 10; i++) {
        if (!(await this.wait(LOCK_STEP_MS, run))) return false;
        this.home.update(d => d.map((v, j) => (j === i ? finalHome[i] : v)));
        this.homeLocked.update(l => l.map((v, j) => v || j === i));
      }
      for (let i = 0; i < 10; i++) {
        if (!(await this.wait(LOCK_STEP_MS, run))) return false;
        this.away.update(d => d.map((v, j) => (j === i ? finalAway[i] : v)));
        this.awayLocked.update(l => l.map((v, j) => v || j === i));
      }
      return true;
    } finally {
      clearInterval(flicker);
    }
  }
  private async loop(run: number): Promise<void> {
    while (run === this.run) {
      this.reset();

      for (const index of shuffle([...Array(100).keys()])) {
        if (!(await this.wait(FILL_STEP_MS, run))) return;
        this.claims.update(c => {
          const next = [...c];
          next[index] = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
          return next;
        });
        this.claimedCount.update(n => n + 1);
      }

      if (!(await this.wait(700, run))) return;
      this.phase.set('drawing');
      if (!(await this.draw(run))) return;

      this.phase.set('locked');
      if (!(await this.wait(3500, run))) return;
    }
  }
  private reset(): void {
    this.phase.set('filling');
    this.claims.set(Array(100).fill(null));
    this.claimedCount.set(0);
    this.home.set(Array(10).fill(null));
    this.away.set(Array(10).fill(null));
    this.homeLocked.set(Array(10).fill(false));
    this.awayLocked.set(Array(10).fill(false));
  }
  private showFinal(): void {
    this.claims.set(Array.from({ length: 100 }, (_, i) => PLAYERS[i % PLAYERS.length]));
    this.claimedCount.set(100);
    this.home.set(shuffle([...Array(10).keys()]));
    this.away.set(shuffle([...Array(10).keys()]));
    this.homeLocked.set(Array(10).fill(true));
    this.awayLocked.set(Array(10).fill(true));
    this.phase.set('locked');
  }
  private wait(ms: number, run: number): Promise<boolean> {
    return new Promise(resolve => setTimeout(() => resolve(run === this.run), ms));
  }}

function randomDigit(): number {
  return Math.floor(Math.random() * 10);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
