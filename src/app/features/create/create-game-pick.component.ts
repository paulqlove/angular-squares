import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import type { EspnGame, SportType } from '../../core/services/espn.service';
import { GamePickCardComponent } from '../../shared/game-pick-card.component';
import { filterGames } from '../../core/utils/espn-game-search';
import { SPORT_OPTIONS } from './create-game-form.utils';

/**
 * Create game's first step: the sport, then a game from the schedule or two custom teams.
 * It only shows the choices and reports picks; the form keeps the state.
 */
@Component({
  selector: 'app-create-game-pick',
  imports: [FormsModule, NgIconComponent, GamePickCardComponent],
  providers: [provideIcons({ heroMagnifyingGlass })],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<section>
  <h3 class="qs-label text-qs-muted">Sport</h3>
  <div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sport">
    @for (option of sportOptions; track option.value) {
      <button
        type="button"
        class="qs-tab"
        [attr.aria-pressed]="sport() === option.value"
        (click)="sportSelected.emit(option.value)"
      >
        {{ option.label }}
      </button>
    }
  </div>
</section>
<section class="flex min-h-0 flex-1 flex-col">
  <h3 class="qs-label text-qs-muted">{{ sport() === 'custom' ? 'Teams' : 'Game' }}</h3>
  @if (sport() === 'custom') {
    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="custom-away" class="qs-label mb-2 block text-qs-muted">Away team</label>
        <input id="custom-away" type="text" [(ngModel)]="away" maxlength="50" placeholder="e.g. Lincoln High" class="qs-input" />
      </div>
      <div>
        <label for="custom-home" class="qs-label mb-2 block text-qs-muted">Home team</label>
        <input id="custom-home" type="text" [(ngModel)]="home" maxlength="50" placeholder="e.g. Washington High" class="qs-input" />
      </div>
    </div>
    <p class="mt-2 text-xs text-qs-muted">Enter scores manually from the game page after creating the board.</p>
  } @else if (loading()) {
    <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-busy="true">
      @for (i of [0, 1, 2, 3]; track i) {
        <div class="h-[76px] animate-pulse rounded-inner bg-qs-panel-2"></div>
      }
    </div>
  } @else if (games().length === 0) {
    <p class="mt-2 rounded-inner border border-dashed border-qs-line-strong p-4 text-sm text-qs-muted">Games coming soon.</p>
    <button type="button" class="qs-btn qs-btn-secondary mt-3" (click)="sportSelected.emit('custom')">Use custom teams</button>
  } @else if (!listOpen() && selectedGame(); as game) {
    <!-- Picked: collapse to the choice so the rest of the form is right there -->
    <div class="mt-2 rounded-inner border border-qs-accent bg-qs-panel p-3 outline outline-2 -outline-offset-2 outline-qs-accent">
      <app-game-pick-card [game]="game" [sport]="sport()" [large]="true"></app-game-pick-card>
      <button type="button" (click)="changeGame.emit()" class="qs-btn qs-btn-secondary mt-3 w-full">Change game</button>
    </div>
  } @else {
    @if (games().length > 10) {
      <div class="mt-2">
        <div class="qs-search">
          <ng-icon name="heroMagnifyingGlass" class="qs-search-icon" aria-hidden="true"></ng-icon>
          <input
            type="search"
            aria-label="Search teams"
            [(ngModel)]="search"
            (keydown.enter)="$event.preventDefault()"
            placeholder="Search teams"
            autocomplete="off"
          />
        </div>
      </div>
    }
    <div class="qs-canvas mt-3 min-h-40 flex-1 overflow-y-auto rounded-inner p-2 max-sm:flex-none max-sm:overflow-visible">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        @for (game of filteredGames(); track game.id) {
          <button
            type="button"
            (click)="gameSelected.emit(game.id)"
            [attr.aria-pressed]="selectedGameId() === game.id"
            [attr.aria-label]="game.awayTeamFull + ' at ' + game.homeTeamFull"
            class="rounded-inner border bg-qs-panel px-3 pb-3 pt-2.5 text-left transition-colors"
            [class]="selectedGameId() === game.id ? 'border-qs-accent outline outline-2 -outline-offset-2 outline-qs-accent' : 'border-qs-line hover:border-qs-line-strong'"
          >
            <app-game-pick-card [game]="game" [sport]="sport()" [large]="true"></app-game-pick-card>
          </button>
        }
      </div>
    </div>
  }
</section>
`
})
export class CreateGamePickComponent {
  public readonly sport = input.required<SportType | 'custom'>();
  public readonly games = input<EspnGame[]>([]);
  public readonly loading = input(false);
  public readonly selectedGameId = input('');
  /** False once a game is picked, so the list collapses to that game. */
  public readonly listOpen = input(true);
  public readonly search = model('');
  public readonly away = model('');
  public readonly home = model('');
  public readonly sportSelected = output<SportType | 'custom'>();
  public readonly gameSelected = output<string>();
  public readonly changeGame = output<void>();

  protected readonly sportOptions = SPORT_OPTIONS;
  protected readonly selectedGame = computed(() => this.games().find(g => g.id === this.selectedGameId()));
  protected readonly filteredGames = computed(() => filterGames(this.games(), this.search()));
}
