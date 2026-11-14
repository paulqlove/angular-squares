import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroMagnifyingGlass, heroXMark } from '@ng-icons/heroicons/outline';

import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { PlayersViewService } from '../../services/players-view.service';

/** A game row in the sheet: `id` null is "All N games". */
interface GameRow {
  id: string | null;
  label: string;
}

/**
 * Phones, Players tab: the filter sheet from the dock's Find a player field, keyboard up. Find a player, then
 * the games to pick one from, then Clear and Show players. Picks apply as they're made; Show players closes the sheet.
 */
@Component({
  selector: 'app-players-filter-sheet',
  imports: [ModalComponent, NgIconComponent],
  providers: [provideIcons({ heroCheck, heroMagnifyingGlass, heroXMark })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="players.filterOpen()" labelledBy="players-filter-title" phone="sheet" extraClass="flex max-h-[85dvh] flex-col text-qs-ink" (dismissed)="close()">
      <div class="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-qs-line-strong sm:hidden" aria-hidden="true"></div>
      <div class="flex shrink-0 items-center justify-between gap-3 px-4 pt-2">
        <h3 id="players-filter-title" class="text-xl font-semibold">Filter players</h3>
        <button type="button" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close" (click)="close()">
          <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
        </button>
      </div>

      <div class="shrink-0 px-4 pt-2">
        <label class="qs-search">
          <ng-icon name="heroMagnifyingGlass" class="qs-search-icon" aria-hidden="true"></ng-icon>
          <input type="search" placeholder="Find a player" aria-label="Find a player" enterkeyhint="search" data-autofocus [value]="players.search()" (input)="searchFor($event)" (keydown.enter)="close()" />
          @if (players.search()) {
            <button type="button" class="qs-search-clear" aria-label="Clear search" (click)="players.search.set('')">
              <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
            </button>
          }
        </label>
      </div>

      <p id="players-filter-games" class="qs-label shrink-0 px-4 pb-1 pt-5 text-qs-muted">Games</p>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" role="radiogroup" aria-labelledby="players-filter-games">
        @for (game of games(); track game.id; let first = $first) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="game.id === players.gameFilter()"
            class="flex min-h-11 w-full items-center gap-3 text-left text-base"
            [class.border-t]="!first"
            [class.border-qs-line]="!first"
            (click)="players.gameFilter.set(game.id)"
          >
            <span class="flex w-5 shrink-0 justify-center" aria-hidden="true">
              @if (game.id === players.gameFilter()) {
                <ng-icon name="heroCheck" class="text-lg"></ng-icon>
              }
            </span>
            <span class="min-w-0 truncate">{{ game.label }}</span>
          </button>
        }
      </div>

      <div class="flex shrink-0 gap-2 border-t border-qs-line px-4 pb-4 pt-3">
        <button type="button" class="qs-btn qs-btn-secondary w-28 shrink-0" (click)="players.clearFilters()">Clear</button>
        <button type="button" class="qs-btn qs-btn-ink min-w-0 flex-1" (click)="close()">Show players</button>
      </div>
    </app-modal>
  `
})
export class PlayersFilterSheetComponent {
  /** "All N games" first, then each game in season order. */
  public readonly games = computed<GameRow[]>(() => [
    { id: null, label: `All ${this.players.boards().length} games` },
    ...this.players.boards().map(board => ({ id: board.id as string, label: board.name }))
  ]);

  protected readonly players: PlayersViewService = inject(PlayersViewService);

  protected close(): void {
    this.players.filterOpen.set(false);
  }

  protected searchFor(event: Event): void {
    this.players.search.set((event.target as HTMLInputElement).value);
  }
}
