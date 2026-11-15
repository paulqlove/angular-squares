import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass } from '@ng-icons/heroicons/outline';

import type { EspnGame, SportType } from '../../../../core/services/espn.service';
import { filterGames } from '../../../../core/utils/espn-game-search';
import { GamePickCardComponent } from '../../../../shared/game-pick-card.component';

/** Edit game's ESPN game on the dashboard: the linked game with Change game, or the sport's games to pick from. */
@Component({
  selector: 'app-edit-game-espn-pick',
  imports: [NgIconComponent, GamePickCardComponent],
  providers: [provideIcons({ heroMagnifyingGlass })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <span class="qs-label text-qs-muted">ESPN game</span>
      @if (loading()) {
        <div class="h-[60px] animate-pulse rounded-inner bg-qs-panel-2"></div>
      } @else if (gameId() && !changing()) {
        <div class="rounded-inner border border-qs-accent bg-qs-panel p-3">
          @if (selected(); as sel) {
            <app-game-pick-card [game]="sel" [sport]="sport()"></app-game-pick-card>
          } @else {
            <p class="truncate text-sm font-semibold text-qs-ink">Linked game</p>
          }
          <button type="button" class="qs-btn qs-btn-secondary mt-3 w-full" (click)="changing.set(true)">Change game</button>
        </div>
      } @else {
        @if (games().length > 10) {
          <div class="qs-search">
            <ng-icon name="heroMagnifyingGlass" class="qs-search-icon" aria-hidden="true"></ng-icon>
            <input type="search" [value]="search()" (input)="onSearch($event)" placeholder="Search teams" aria-label="Search teams" autocomplete="off" (keydown.enter)="$event.preventDefault()" />
          </div>
        }
        <div class="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          @for (game of filtered(); track game.id) {
            <button
              type="button"
              (click)="pick(game.id)"
              [attr.aria-pressed]="gameId() === game.id"
              [attr.aria-label]="game.awayTeamFull + ' at ' + game.homeTeamFull"
              class="rounded-inner border bg-qs-panel px-3 pb-3 pt-2.5 text-left transition-colors"
              [class]="gameId() === game.id ? 'border-qs-accent outline outline-2 -outline-offset-2 outline-qs-accent' : 'border-qs-line hover:border-qs-line-strong'"
            >
              <app-game-pick-card [game]="game" [sport]="sport()"></app-game-pick-card>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class EditGameEspnPickComponent {
  constructor() {
    // A new sport starts a fresh search
    effect(() => {
      this.sport();
      untracked(() => this.search.set(''));
    });
  }

  public readonly gameId = model<string | undefined>('');
  public readonly games = input<EspnGame[]>([]);
  public readonly loading = input<boolean>(false);
  public readonly sport = input<SportType | 'custom' | undefined>(undefined);

  protected readonly changing = signal<boolean>(false);
  protected readonly search = signal<string>('');
  protected readonly filtered = computed<EspnGame[]>(() => filterGames(this.games(), this.search()));
  protected readonly selected = computed<EspnGame | undefined>(() => this.games().find(g => g.id === this.gameId()));

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected pick(id: string): void {
    this.gameId.set(id);
    this.changing.set(false);
  }
}
