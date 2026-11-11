import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown, heroChevronRight, heroHashtag, heroLockClosed, heroPlus, heroSquares2x2 } from '@ng-icons/heroicons/outline';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { miniCellClass, miniGridCells, miniGridClass } from '../../../core/utils/mini-grid';
import { YourGameRow, forgetRecentVisit, pickYourGameIds, readRecentVisits, toYourGameRow } from '../../../core/utils/recent-games';
import { ModalComponent } from '../modal/modal.component';

/** How many games the menu lists. */
const SHOWN = 5;
/** Extra ids read in case some of the newest were deleted since. */
const SPARE = 3;
/** A game code as players type it: six letters and digits. */
const CODE = /^[A-Z0-9]{6}$/;

/**
 * Your Games, in the game page header: the five most recent games for hosts, players and guests alike, the one on screen
 * marked, then Join with a code and My dashboard. A popover on desktop and a bottom sheet on phones.
 */
@Component({
  selector: 'app-your-games-menu',
  imports: [ModalComponent, NgIconComponent, NgTemplateOutlet, RouterLink],
  providers: [provideIcons({ heroChevronDown, heroChevronRight, heroHashtag, heroLockClosed, heroPlus, heroSquares2x2 })],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    @keyframes menu-in { from { opacity: 0; transform: translateY(-4px); } }
    .animate-menu-in { animation: menu-in 120ms cubic-bezier(.2,.7,.2,1); }
    @media (prefers-reduced-motion: reduce) { .animate-menu-in { animation: none; } }
    /* The header sets a light focus ring for its navy bar; the menu is a light panel. */
    .yg-panel :where(a, button, input):focus-visible { outline: 2px solid var(--qs-ink); outline-offset: -2px; }
    .qs-mini { background: var(--qs-line); }
    .qs-mini-open { background: color-mix(in srgb, var(--qs-accent) 38%, var(--qs-panel)); }
    .qs-mini-claimed, .qs-mini-taken { background: color-mix(in srgb, var(--qs-line-strong) 40%, var(--qs-panel)); }
    .qs-mini-blank { background: var(--qs-panel); }
  `],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        aria-haspopup="true"
        aria-controls="your-games-menu"
        class="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-btn p-2.5 text-qs-tile-muted transition-colors hover:bg-white/10 hover:text-qs-tile-ink sm:px-3"
        [class.text-qs-tile-ink]="open()"
        aria-label="Your games"
      >
        <ng-icon name="heroSquares2x2" class="text-xl"></ng-icon>
        <span class="qs-label hidden sm:inline">Your games</span>
        <ng-icon name="heroChevronDown" class="hidden text-sm transition-transform sm:inline" [class.rotate-180]="open()"></ng-icon>
      </button>

      @if (open() && !phone()) {
        <div id="your-games-menu" class="yg-panel absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-[12px] border border-qs-line bg-qs-panel p-1.5 text-qs-ink shadow-pop animate-menu-in">
          <ng-container *ngTemplateOutlet="body"></ng-container>
        </div>
      }

      <app-modal [open]="open() && phone()" labelledBy="your-games-title" phone="sheet" extraClass="yg-panel px-1.5 pb-4 pt-2 text-qs-ink" (dismissed)="close()">
        <span class="mx-auto mb-2 mt-0.5 block h-1 w-10 rounded bg-qs-line-strong" aria-hidden="true"></span>
        <ng-container *ngTemplateOutlet="body"></ng-container>
      </app-modal>
    </div>

    <ng-template #body>
      <div class="flex items-baseline justify-between px-3 py-2.5">
        <h2 id="your-games-title" class="qs-label">Your games</h2>
        @if (rows().length) {
          <span class="qs-label text-qs-muted">{{ countLabel() }}</span>
        }
      </div>

      <div class="flex flex-col">
        @if (!loaded()) {
          @for (i of [0, 1, 2]; track i) {
            <div class="flex min-h-14 items-center gap-3 px-3 py-2" aria-hidden="true">
              <span class="h-[30px] w-[30px] animate-pulse rounded-[3px] bg-qs-panel-2"></span>
              <span class="flex flex-1 flex-col gap-1.5">
                <span class="h-3.5 w-2/3 animate-pulse rounded bg-qs-panel-2"></span>
                <span class="h-3 w-1/3 animate-pulse rounded bg-qs-panel-2"></span>
              </span>
            </div>
          }
        } @else if (failed() && !rows().length) {
          <p class="px-3 py-3 text-sm text-qs-muted">Couldn't load your games. Try again in a moment.</p>
        }
        @for (row of rows(); track row.id) {
          <a
            [routerLink]="['/game', row.id]"
            [state]="{ boardSize: row.boardSize }"
            (click)="close()"
            [attr.aria-current]="row.id === currentGameId() ? 'page' : null"
            [attr.aria-label]="'Open ' + row.name"
            class="relative grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-btn px-3 py-2 transition-colors hover:bg-qs-panel-2"
            [class.bg-qs-panel-2]="row.id === currentGameId()"
          >
            @if (row.id === currentGameId()) {
              <span class="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-[3px] bg-qs-ink" aria-hidden="true"></span>
            }
            <span [class]="'qs-mini grid w-[30px] shrink-0 gap-px rounded-[2px] p-px ' + gridClass(row)" aria-hidden="true">
              @for (i of cells(row); track i) {
                <span class="aspect-square" [class]="cellClass(row, i)"></span>
              }
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="truncate text-[15px] font-semibold tracking-[-0.015em]">{{ row.name }}</span>
                @if (row.host) {
                  <span class="shrink-0 rounded-[4px] border border-qs-line-strong px-1.5 py-[3px] font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.08em] text-qs-muted">Host</span>
                }
                @if (row.id === currentGameId()) {
                  <span class="shrink-0 rounded-[4px] border border-qs-ink px-1.5 py-[3px] font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.08em] text-qs-ink">Viewing</span>
                }
              </span>
              <span class="truncate text-[13px] text-qs-muted">{{ row.matchup }}</span>
            </span>
            <span class="flex flex-col items-end gap-[3px] whitespace-nowrap text-right">
              @switch (row.state) {
                @case ('locked') {
                  <span class="inline-flex items-center gap-1 text-[13px] text-qs-muted"><ng-icon name="heroLockClosed" class="text-[13px]"></ng-icon>Locked</span>
                }
                @case ('ready') {
                  <span class="text-[13px] text-qs-muted">Ready to lock</span>
                  <span class="font-mono text-[11.5px] uppercase tracking-[0.06em] text-qs-muted">Full</span>
                }
                @default {
                  <span class="text-[13px] text-qs-muted">Filling</span>
                  <span class="font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-qs-accent">{{ row.openCount }} open</span>
                }
              }
            </span>
          </a>
        }
      </div>

      <div class="mt-1.5 flex flex-col border-t border-qs-line pt-1.5">
        @if (joining()) {
          <form class="flex items-center gap-2 px-1.5 py-1" (submit)="$event.preventDefault(); join()">
            <label for="your-games-code" class="sr-only">Game code</label>
            <input
              id="your-games-code"
              type="text"
              [value]="code()"
              (input)="setCode($any($event.target).value)"
              placeholder="ABC123"
              maxlength="6"
              autocapitalize="characters"
              autocomplete="off"
              spellcheck="false"
              class="min-h-11 min-w-0 flex-1 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-3 text-center font-mono text-base uppercase tracking-[0.2em] text-qs-ink"
            />
            <button type="submit" class="qs-btn qs-btn-primary" [disabled]="!codeValid()">Join</button>
          </form>
        } @else {
          <button type="button" (click)="startJoin()" class="flex min-h-11 items-center gap-3 rounded-btn px-3 text-left text-sm transition-colors hover:bg-qs-panel-2">
            <ng-icon name="heroHashtag" class="shrink-0 text-lg text-qs-muted"></ng-icon>
            <span>Join with a code</span>
          </button>
        }
        @if (loaded() && rows().length <= 1) {
          <a [routerLink]="createLink()" [queryParams]="createQuery()" (click)="close()" class="flex min-h-11 items-center gap-3 rounded-btn px-3 text-sm transition-colors hover:bg-qs-panel-2">
            <ng-icon name="heroPlus" class="shrink-0 text-lg text-qs-muted"></ng-icon>
            <span>Create a game</span>
          </a>
        }
        <a routerLink="/dashboard" (click)="close()" class="flex min-h-11 items-center gap-3 rounded-btn px-3 text-sm transition-colors hover:bg-qs-panel-2">
          <ng-icon name="heroSquares2x2" class="shrink-0 text-lg text-qs-muted"></ng-icon>
          <span>My dashboard</span>
          <ng-icon name="heroChevronRight" class="ml-auto shrink-0 text-base text-qs-muted"></ng-icon>
        </a>
      </div>
    </ng-template>
  `
})
export class YourGamesMenuComponent {
  /** The game on screen, listed first and marked Viewing. */
  currentGameId = input.required<string>();

  close(): void {
    this.open.set(false);
    this.joining.set(false);
    this.code.set('');
  }

  /** Closes the popover on a click anywhere else. The phone sheet closes from its own backdrop. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open() && !this.phone() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.phone()) this.close();
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.phone.set(typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 639.98px)').matches);
    this.open.set(true);
    void this.load();
  }

  protected code = signal('');
  protected codeValid = computed(() => CODE.test(this.code()));
  protected countLabel = computed(() => (this.rows().length === 1 ? '1 game' : `${this.rows().length} recent`));
  /** Guests can't host, so their Create goes to the public set-up page, which asks them to sign in when they finish. */
  protected createLink = computed(() => (this.auth.canCreateGame() ? '/dashboard' : '/create'));
  protected createQuery = computed(() => (this.auth.canCreateGame() ? { create: 'true' } : {}));
  protected failed = signal(false);
  protected joining = signal(false);
  protected loaded = signal(false);
  protected open = signal(false);
  /** Set when the menu opens: phones get the bottom sheet, wider screens the popover. */
  protected phone = signal(false);
  protected rows = signal<YourGameRow[]>([]);

  protected cellClass(row: YourGameRow, index: number): string {
    return miniCellClass(index, row.squaresFilled, row.state !== 'filling');
  }

  protected cells(row: YourGameRow): number[] {
    return miniGridCells(row.boardSize);
  }

  protected gridClass(row: YourGameRow): string {
    return miniGridClass(row.boardSize);
  }

  protected join(): void {
    if (!this.codeValid()) return;
    const code = this.code();
    this.close();
    void this.router.navigate(['/game', code]);
  }

  protected setCode(value: string): void {
    this.code.set(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }

  protected startJoin(): void {
    this.joining.set(true);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('#your-games-code')?.focus());
  }

  private auth = inject(AuthService);
  private gameService = inject(GameService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Bumped on each open, so an older load that finishes late doesn't overwrite a newer one. */
  private loadId = 0;
  private router = inject(Router);

  /** Reads the account's own games and this device's visits, then only the few games the menu shows. */
  private async load(): Promise<void> {
    const id = ++this.loadId;
    const user = this.auth.currentUser();
    const uid = user?.uid ?? null;
    let failed = false;
    const index = user && !user.isGuest
      ? await this.gameService.getYourGameIndex(user.uid).catch(() => ((failed = true), []))
      : [];
    const ids = pickYourGameIds(readRecentVisits(), index, this.currentGameId(), SHOWN + SPARE);
    const games = await Promise.all(ids.map(gameId => this.gameService.getGame(gameId).catch(() => ((failed = true), undefined))));
    if (id !== this.loadId) return;
    const rows: YourGameRow[] = [];
    games.forEach((game, i) => {
      if (game) rows.push(toYourGameRow({ ...game, id: ids[i] }, uid));
      else if (game === null) forgetRecentVisit(ids[i]);
    });
    this.rows.set(rows.slice(0, SHOWN));
    this.failed.set(failed);
    this.loaded.set(true);
  }
}
