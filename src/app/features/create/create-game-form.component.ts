import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheckCircle } from '@ng-icons/heroicons/outline';
import { EmptyQuarterRuleComponent } from '../../components/ui/empty-quarter-rule/empty-quarter-rule.component';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../../core/plans';
import { EspnGame, EspnService, SportType } from '../../core/services/espn.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import type { BoardSize } from '../../core/services/game.service';
import {
  CreateGameDraft, CreateGameValues, buildCreateGameValues, emptyDraft, loadCreateDraft, splitToTenths
} from '../../core/utils/create-game-draft';
import { formatGameDate, gameStatusClass, gameStatusText } from '../../core/utils/espn-game-display';
import { getTeamLogoByAbbreviation } from '../content/teams-data';

export interface CreateGameSubmit {
  draft: CreateGameDraft;
  values: CreateGameValues;
}

/**
 * The "Set up your board" fields, shared by the dashboard dialog and the signed-out /create page.
 * It never touches Firebase: the host decides what happens on submit.
 */
@Component({
  selector: 'app-create-game-form',
  imports: [FormsModule, NgIconComponent, EmptyQuarterRuleComponent],
  providers: [provideIcons({ heroCheckCircle })],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
  <div class="flex-1 space-y-8 overflow-y-auto px-6 py-6">
    <!-- 01 Sport -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">01 / Sport</h4>
      <div class="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Sport">
        @for (sport of sportOptions; track sport.value) {
          <button
            type="button"
            role="tab"
            class="qs-tab"
            [attr.aria-selected]="selectedSport === sport.value"
            (click)="selectSport(sport.value)"
          >
            {{ sport.label }}
          </button>
        }
      </div>
    </section>

    <!-- 02 Game / Teams -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">02 / {{ selectedSport === 'custom' ? 'Teams' : 'Game' }}</h4>
      @if (selectedSport === 'custom') {
        <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="custom-away" class="qs-label mb-1.5 block text-qs-muted">Away team</label>
            <input id="custom-away" type="text" [(ngModel)]="customAwayTeam" maxlength="50" placeholder="e.g. Lincoln High" class="qs-input" />
          </div>
          <div>
            <label for="custom-home" class="qs-label mb-1.5 block text-qs-muted">Home team</label>
            <input id="custom-home" type="text" [(ngModel)]="customHomeTeam" maxlength="50" placeholder="e.g. Washington High" class="qs-input" />
          </div>
        </div>
        <p class="mt-2 text-xs text-qs-muted">Enter scores manually from the game page after creating the board.</p>
      } @else if (isLoadingEspnGames()) {
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-busy="true">
          @for (i of [0, 1, 2, 3]; track i) {
            <div class="h-[76px] animate-pulse rounded-inner bg-qs-panel-2"></div>
          }
        </div>
      } @else if (espnGames().length === 0) {
        <p class="mt-3 rounded-inner border border-dashed border-qs-line-strong p-4 text-sm text-qs-muted">No games on the schedule for this sport right now.</p>
      } @else if (!gameListOpen && selectedEspnGame(); as game) {
        <!-- Picked: collapse to the choice so the rest of the form is right there -->
        <div class="mt-3 flex items-center justify-between gap-3 rounded-inner border border-qs-accent bg-qs-panel p-3 outline outline-2 -outline-offset-2 outline-qs-accent">
          <div class="min-w-0">
            <span class="qs-badge" [class]="gameStatusClass(game.status)">{{ gameStatusText(game) }}</span>
            <p class="mt-2 truncate font-semibold text-qs-ink">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
            @if (game.status === 'pre' && game.date) {
              <p class="qs-label mt-1 text-[10px] text-qs-muted">{{ formatGameDate(game.date) }}</p>
            }
          </div>
          <button type="button" (click)="gameListOpen = true" class="qs-btn qs-btn-secondary shrink-0 px-3">Change</button>
        </div>
      } @else {
        @if (espnGames().length > 10) {
          <div class="mt-3">
            <input
              type="text"
              [(ngModel)]="espnGameSearch"
              placeholder="Search teams..."
              class="qs-input w-full"
            />
          </div>
        }
        <div class="qs-canvas mt-3 max-h-80 overflow-y-auto rounded-inner p-2 sm:max-h-72">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            @for (game of filteredEspnGames(); track game.id) {
              <button
                type="button"
                (click)="selectEspnGame(game.id)"
                [attr.aria-pressed]="selectedEspnGameId === game.id"
                class="rounded-inner border bg-qs-panel p-3 text-left transition-colors"
                [class]="selectedEspnGameId === game.id ? 'border-qs-accent outline outline-2 -outline-offset-2 outline-qs-accent' : 'border-qs-line hover:border-qs-line-strong'"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="qs-badge" [class]="gameStatusClass(game.status)">{{ gameStatusText(game) }}</span>
                  @if (selectedEspnGameId === game.id) {
                    <ng-icon name="heroCheckCircle" class="text-lg text-qs-accent"></ng-icon>
                  }
                </div>
                <p class="mt-2 flex items-center gap-1.5 truncate font-semibold text-qs-ink">
                  @if (selectedSport === 'nfl' && getTeamLogo(game.awayTeam); as logo) {
                    <img [src]="logo" [alt]="game.awayTeam" class="h-4 w-4 object-contain" />
                  }
                  {{ game.awayTeam }} &#64;
                  @if (selectedSport === 'nfl' && getTeamLogo(game.homeTeam); as logo) {
                    <img [src]="logo" [alt]="game.homeTeam" class="h-4 w-4 object-contain" />
                  }
                  {{ game.homeTeam }}
                </p>
                <p class="qs-label mt-1 text-[10px] text-qs-muted">
                  @if (game.status === 'pre' && game.date) {
                    {{ formatGameDate(game.date) }}
                  } @else if (game.status !== 'pre') {
                    {{ game.awayScore }} – {{ game.homeScore }}
                  }
                </p>
              </button>
            }
          </div>
        </div>
      }
    </section>

    <!-- 03 Board size -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">03 / Board size</h4>
      <div class="mt-3 flex flex-wrap gap-2">
        @for (size of boardSizeOptions; track size.value) {
          <button
            type="button"
            class="qs-tab"
            [attr.aria-pressed]="newGameBoardSize === size.value"
            (click)="newGameBoardSize = size.value"
          >
            {{ size.label }}
          </button>
        }
      </div>
      <p class="mt-2 text-xs text-qs-muted">{{ boardSizeOptions.find(s => s.value === newGameBoardSize)?.description }}</p>
    </section>

    <!-- 04 Points -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">04 / Points per square</h4>
      <div class="mt-3 flex flex-wrap gap-2">
        @for (price of pricePresets; track price) {
          <button
            type="button"
            class="qs-tab min-w-16"
            [attr.aria-pressed]="newGamePrice === price"
            (click)="selectPrice(price)"
          >
            {{ price === 0 ? 'None' : price + ' pts' }}
          </button>
        }
        <label class="flex min-h-11 items-center gap-1 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-3 focus-within:border-qs-ink">
          <input
            type="number"
            [(ngModel)]="customPrice"
            (ngModelChange)="onCustomPriceChange()"
            placeholder="Custom"
            aria-label="Custom points per square"
            min="0"
            class="w-20 bg-transparent text-base text-qs-ink placeholder:text-qs-muted focus:outline-none"
          />
          <span class="qs-label text-qs-muted">pts</span>
        </label>
      </div>
    </section>

    <!-- 05 Quarter split -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">05 / Quarter split</h4>
      @if (!customSplitsAllowed) {
        <p class="mt-3 text-sm text-qs-muted">
          <span class="font-mono tabular-nums text-qs-ink">20 / 20 / 20 / 40</span> · Custom splits come with the Season Pass.
        </p>
      } @else {
      <div class="mt-3 flex flex-wrap gap-1.5">
        @for (preset of splitPresets; track preset.id) {
          <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px]" [attr.aria-pressed]="newGameActivePreset() === preset.id" (click)="applyNewGameSplitPreset(preset.split)">{{ preset.label }}</button>
        }
        <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px]" [attr.aria-pressed]="newGameActivePreset() === 'custom'" (click)="newGameSplitCustomOpen = true">Custom</button>
      </div>
      @if (newGameSplitCustomOpen || newGameActivePreset() === 'custom') {
        <div class="mt-3 grid grid-cols-4 gap-2">
          @for (q of quarters; track q.key) {
            <div>
              <label [for]="'new-split-' + q.key" class="qs-label mb-1 block text-[10px] text-qs-muted">{{ q.label }}</label>
              <input [id]="'new-split-' + q.key" type="number" min="0" max="100" step="0.5" [(ngModel)]="newGameSplitPct[q.key]" class="qs-input px-2 text-center tabular-nums" />
            </div>
          }
        </div>
      }
      <p class="mt-1.5 text-xs tabular-nums" [class]="newGameSplitValid() ? 'text-qs-muted' : 'text-qs-bad'">
        {{ newGameSplitText() }} · {{ newGameSplitValid() ? 'Totals 100%' : 'Must total 100% (' + newGameSplitRemaining() + ' left)' }}
      </p>
      }
      <div class="mt-5">
        <app-empty-quarter-rule name="new-empty-quarter-rule" [(value)]="newGameEmptyRule"></app-empty-quarter-rule>
      </div>
    </section>

    <!-- 06 Details -->
    <section>
      <h4 class="qs-eyebrow qs-eyebrow-bar">06 / Details</h4>
      <div class="mt-3 space-y-4">
        <div>
          <label for="new-game-name" class="qs-label mb-1.5 block text-qs-muted">Game name <span class="text-qs-bad">*</span></label>
          <input
            id="new-game-name"
            type="text"
            [(ngModel)]="newGameName"
            placeholder="Super Bowl party"
            class="qs-input"
            [class.qs-input-error]="gameNameError()"
            [attr.aria-invalid]="gameNameError()"
          />
          @if (gameNameError()) {
            <p class="mt-1.5 text-sm text-qs-bad">Give your game a name.</p>
          }
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="new-game-host-note" class="qs-label mb-1.5 block text-qs-muted">Note from the host <span class="normal-case tracking-normal">(optional)</span></label>
            <input id="new-game-host-note" type="text" [(ngModel)]="newGameHostNote" maxlength="140" placeholder="e.g. Snacks at halftime!" class="qs-input" />
          </div>
          <div>
            <label for="new-game-manager" class="qs-label mb-1.5 block text-qs-muted">Co-host <span class="normal-case tracking-normal">(optional)</span></label>
            <input id="new-game-manager" type="email" [(ngModel)]="newGamePaymentManager" placeholder="their@email.com" class="qs-input" />
          </div>
        </div>
        <p class="text-xs text-qs-muted">A co-host can help manage players.</p>
      </div>
    </section>
  </div>

  <div class="flex items-center justify-end gap-2 border-t border-qs-line bg-qs-panel-2 px-6 py-4">
    @if (!newGameSplitValid()) {
      <p class="mr-auto text-sm text-qs-bad" role="status">The quarter split must total 100% before you can create.</p>
    }
    <button type="button" (click)="cancelled.emit()" class="qs-btn qs-btn-ghost text-qs-muted">Cancel</button>
    <button type="button" (click)="submit()" [disabled]="isCreating || !newGameSplitValid()" [attr.aria-busy]="isCreating" class="qs-btn qs-btn-primary min-w-40">
      @if (isCreating) {
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Creating
      } @else {
        Create game
      }
    </button>
  </div>
`
})
export class CreateGameFormComponent implements OnInit {
  @Input() customSplitsAllowed = false;
  @Input() isCreating = false;
  @Output() cancelled = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<CreateGameSubmit>();

  boardSizeOptions: { value: BoardSize; label: string; description: string }[] = [
    { value: 100, label: '100 squares', description: '10×10 grid (classic)' },
    { value: 50, label: '50 squares', description: '5×10 grid' },
    { value: 25, label: '25 squares', description: '5×5 grid' }
  ];
  customAwayTeam = '';
  customHomeTeam = '';
  customPrice: number | null = null;
  espnGames = signal<EspnGame[]>([]);
  espnGameSearch = '';
  gameListOpen = true;
  gameNameError = signal(false);
  isLoadingEspnGames = signal(false);
  newGameBoardSize: BoardSize = 100;
  newGameEmptyRule: EmptyQuarterRule = DEFAULT_EMPTY_QUARTER_RULE;
  newGameHostNote = '';
  newGameName = '';
  newGamePaymentManager = '';
  newGamePrice = 10;
  newGameSplitCustomOpen = false;
  newGameSplitPct: QuarterSplit = { q1: 20, q2: 20, q3: 20, q4: 40 };
  pricePresets = [0, 5, 10, 20, 50];
  readonly quarters: { key: keyof QuarterSplit; label: string }[] = [
    { key: 'q1', label: 'Q1' }, { key: 'q2', label: 'Q2' }, { key: 'q3', label: 'Q3' }, { key: 'q4', label: 'Q4' }
  ];
  selectedEspnGameId = '';
  selectedSport: SportType | 'custom' = 'nfl';
  readonly splitPresets = SPLIT_PRESETS;
  sportOptions: { value: SportType | 'custom'; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'ncaaf', label: 'NCAA Football' },
    { value: 'nba', label: 'NBA' },
    { value: 'wnba', label: 'WNBA' },
    { value: 'afl', label: 'AFL' },
    { value: 'custom', label: 'Custom' }
  ];

  private espnService = inject(EspnService);
  private sanitizer = inject(SanitizationService);

  async ngOnInit(): Promise<void> {
    const draft = loadCreateDraft();
    if (draft) this.applyDraft(draft);
    await this.fetchEspnGames();
    if (draft?.espnGame && this.selectedSport !== 'custom') {
      this.ensureInList(draft.espnGame);
    } else {
      this.applyPendingEspnGame();
    }
  }

  applyNewGameSplitPreset(split: QuarterSplit): void {
    this.newGameSplitPct = { q1: split.q1 / 10, q2: split.q2 / 10, q3: split.q3 / 10, q4: split.q4 / 10 };
    this.newGameSplitCustomOpen = false;
  }

  filteredEspnGames(): EspnGame[] {
    const query = this.espnGameSearch.toLowerCase().trim();
    if (!query) return this.espnGames();
    return this.espnGames().filter(g =>
      g.homeTeam.toLowerCase().includes(query) ||
      g.awayTeam.toLowerCase().includes(query) ||
      g.homeTeamFull.toLowerCase().includes(query) ||
      g.awayTeamFull.toLowerCase().includes(query)
    );
  }

  formatGameDate(isoDate: string): string {
    return formatGameDate(isoDate);
  }

  gameStatusClass(status: string): string {
    return gameStatusClass(status);
  }

  gameStatusText(game: EspnGame): string {
    return gameStatusText(game);
  }

  getTeamLogo(abbrev: string): string | null {
    return getTeamLogoByAbbreviation(abbrev, 100);
  }

  newGameActivePreset(): string {
    const t = splitToTenths(this.newGameSplitPct);
    return this.splitPresets.find(p => t && p.split.q1 === t.q1 && p.split.q2 === t.q2 && p.split.q3 === t.q3 && p.split.q4 === t.q4)?.id ?? 'custom';
  }

  newGameSplitRemaining(): string {
    const total = this.quarters.reduce((sum, q) => sum + (Number(this.newGameSplitPct[q.key]) || 0), 0);
    return (Math.round((100 - total) * 10) / 10).toString() + '%';
  }

  newGameSplitText(): string {
    const fmt = (v: number) => (Math.round(Number(v) * 10) / 10).toString();
    return this.quarters.map(q => fmt(this.newGameSplitPct[q.key])).join(' / ');
  }

  newGameSplitValid(): boolean {
    return isValidSplit(splitToTenths(this.newGameSplitPct));
  }

  onCustomPriceChange(): void {
    if (this.customPrice !== null && this.customPrice >= 0) {
      this.newGamePrice = this.customPrice;
    }
  }

  selectedEspnGame(): EspnGame | undefined {
    return this.espnGames().find(g => g.id === this.selectedEspnGameId);
  }

  selectEspnGame(gameId: string): void {
    this.selectedEspnGameId = gameId;
    this.gameListOpen = false;
  }

  selectPrice(price: number): void {
    this.newGamePrice = price;
    this.customPrice = null;
  }

  selectSport(sport: SportType | 'custom'): void {
    this.selectedSport = sport;
    this.selectedEspnGameId = '';
    this.espnGameSearch = '';
    this.gameListOpen = true;
    if (sport !== 'custom') {
      void this.fetchEspnGames();
    }
  }

  submit(): void {
    const draft = this.toDraft();
    const result = buildCreateGameValues(draft, this.sanitizer, this.customSplitsAllowed);
    if (!result.ok) {
      if (result.reason === 'name') {
        this.gameNameError.set(true);
        this.showField('new-game-name');
      }
      return;
    }
    this.gameNameError.set(false);
    this.submitted.emit({ draft, values: result.values });
  }

  /** The field with the error can be far below the Create button: bring it into view and put the cursor there. */
  private showField(id: string): void {
    const field = document.getElementById(id);
    if (!field) return;
    field.scrollIntoView({ block: 'center' });
    field.focus({ preventScroll: true });
  }

  private applyDraft(draft: CreateGameDraft): void {
    this.newGameName = draft.name;
    this.newGameHostNote = draft.hostNote;
    this.newGamePaymentManager = draft.manager;
    this.selectedSport = draft.sport;
    this.customAwayTeam = draft.customAway;
    this.customHomeTeam = draft.customHome;
    this.newGamePrice = draft.price;
    this.customPrice = draft.customPrice;
    this.newGameBoardSize = draft.boardSize;
    this.newGameSplitPct = { ...draft.splitPct };
    this.newGameEmptyRule = draft.emptyRule;
    if (draft.espnGame && draft.sport !== 'custom') {
      this.selectedEspnGameId = draft.espnGame.id;
      this.gameListOpen = false;
    }
  }

  /** A team page's "Create board" stores the game so it arrives pre-selected. */
  private applyPendingEspnGame(): void {
    const raw = sessionStorage.getItem('qs_create_game');
    if (!raw) return;
    sessionStorage.removeItem('qs_create_game');
    try {
      const game = JSON.parse(raw) as EspnGame;
      if (this.selectedSport !== 'nfl') return;
      if (!this.espnGames().some(g => g.id === game.id)) this.espnGames.update(list => [game, ...list]);
      this.selectEspnGame(game.id);
    } catch {
      // Ignore a malformed entry
    }
  }

  /** The restored pick may have left the schedule; keep it visible so the board can still be made. */
  private ensureInList(game: { awayTeam: string; homeTeam: string; id: string }): void {
    if (this.espnGames().some(g => g.id === game.id)) return;
    const stub: EspnGame = {
      id: game.id, name: `${game.awayTeam} @ ${game.homeTeam}`, homeTeam: game.homeTeam, awayTeam: game.awayTeam,
      homeTeamFull: game.homeTeam, awayTeamFull: game.awayTeam, homeScore: 0, awayScore: 0, period: 0, clock: '',
      status: 'pre', completed: false, quarters: [], date: ''
    };
    this.espnGames.update(list => [stub, ...list]);
  }

  private async fetchEspnGames(): Promise<void> {
    if (this.selectedSport === 'custom') {
      this.espnGames.set([]);
      return;
    }
    this.isLoadingEspnGames.set(true);
    try {
      this.espnGames.set(await this.espnService.getGames(this.selectedSport));
    } finally {
      this.isLoadingEspnGames.set(false);
    }
  }

  private toDraft(): CreateGameDraft {
    const game = this.selectedSport === 'custom' ? undefined : this.selectedEspnGame();
    return {
      ...emptyDraft(),
      boardSize: this.newGameBoardSize,
      customAway: this.customAwayTeam,
      customHome: this.customHomeTeam,
      customPrice: this.customPrice,
      emptyRule: this.newGameEmptyRule,
      espnGame: game ? { id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam } : null,
      hostNote: this.newGameHostNote,
      manager: this.newGamePaymentManager,
      name: this.newGameName,
      price: this.newGamePrice,
      splitPct: { ...this.newGameSplitPct },
      sport: this.selectedSport
    };
  }
}
