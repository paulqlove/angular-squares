import { MaxSquaresFieldComponent } from '../../components/ui/max-squares-field/max-squares-field.component';
import { autoRunLabel } from '../../core/utils/auto-manage';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { ToggleComponent } from '../../components/ui/toggle/toggle.component';
import { EmptyQuarterRuleComponent } from '../../components/ui/empty-quarter-rule/empty-quarter-rule.component';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../../core/plans';
import { EspnGame, EspnService, SportType } from '../../core/services/espn.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import type { BoardSize } from '../../core/services/game.service';
import {
  CreateGameDraft, CreateGameValues, buildCreateGameValues, emptyDraft, loadCreateDraft, splitToTenths
} from '../../core/utils/create-game-draft';
import { GamePickCardComponent } from '../../shared/game-pick-card.component';

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
  imports: [MaxSquaresFieldComponent, FormsModule, NgIconComponent, EmptyQuarterRuleComponent, ToggleComponent, GamePickCardComponent],
  providers: [provideIcons({ heroMagnifyingGlass })],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
  <div class="border-b border-qs-line px-6 py-3">
    <div class="flex items-center justify-between gap-3">
      <p class="qs-eyebrow qs-eyebrow-bar">Step {{ step() }} of {{ stepTitles.length }} · <span class="text-qs-ink">{{ stepTitles[step() - 1] }}</span>@if (step() === 3) { · Optional }</p>
    </div>
    <div class="mt-2 flex gap-1.5" role="progressbar" aria-label="Create board progress" aria-valuemin="1" [attr.aria-valuemax]="stepTitles.length" [attr.aria-valuenow]="step()" [attr.aria-valuetext]="'Step ' + step() + ' of ' + stepTitles.length + ': ' + stepTitles[step() - 1]">
      @for (title of stepTitles; track title; let i = $index) {
        <span class="h-1 flex-1 rounded-full transition-colors duration-200" [class]="i < step() ? 'bg-qs-accent' : 'bg-qs-line'"></span>
      }
    </div>
  </div>

  <form ngNoForm novalidate class="flex min-h-0 flex-1 flex-col" (submit)="onSubmit($event)">
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-3 [scrollbar-gutter:stable] sm:pb-5 sm:pt-4">
    @switch (step()) {
      @case (1) {
        <div class="flex min-h-0 flex-1 flex-col gap-6" animate.enter="qs-tab-in">
          <h2 id="create-step-heading" tabindex="-1" class="sr-only">Your game</h2>
          <section>
  <h3 class="qs-label text-qs-muted">Sport</h3>
  <div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sport">
    @for (sport of sportOptions; track sport.value) {
      <button
        type="button"
        class="qs-tab"
        [attr.aria-pressed]="selectedSport === sport.value"
        (click)="selectSport(sport.value)"
      >
        {{ sport.label }}
      </button>
    }
  </div>
</section>
          <section class="flex min-h-0 flex-1 flex-col">
  <h3 class="qs-label text-qs-muted">{{ selectedSport === 'custom' ? 'Teams' : 'Game' }}</h3>
  @if (selectedSport === 'custom') {
    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="custom-away" class="qs-label mb-2 block text-qs-muted">Away team</label>
        <input id="custom-away" type="text" [(ngModel)]="customAwayTeam" maxlength="50" placeholder="e.g. Lincoln High" class="qs-input" />
      </div>
      <div>
        <label for="custom-home" class="qs-label mb-2 block text-qs-muted">Home team</label>
        <input id="custom-home" type="text" [(ngModel)]="customHomeTeam" maxlength="50" placeholder="e.g. Washington High" class="qs-input" />
      </div>
    </div>
    <p class="mt-2 text-xs text-qs-muted">Enter scores manually from the game page after creating the board.</p>
  } @else if (isLoadingEspnGames()) {
    <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-busy="true">
      @for (i of [0, 1, 2, 3]; track i) {
        <div class="h-[76px] animate-pulse rounded-inner bg-qs-panel-2"></div>
      }
    </div>
  } @else if (espnGames().length === 0) {
    <p class="mt-2 rounded-inner border border-dashed border-qs-line-strong p-4 text-sm text-qs-muted">Games coming soon.</p>
    <button type="button" class="qs-btn qs-btn-secondary mt-3" (click)="selectSport('custom')">Use custom teams</button>
  } @else if (!gameListOpen && selectedEspnGame(); as game) {
    <!-- Picked: collapse to the choice so the rest of the form is right there -->
    <div class="mt-2 rounded-inner border border-qs-accent bg-qs-panel p-3 outline outline-2 -outline-offset-2 outline-qs-accent">
      <app-game-pick-card [game]="game" [sport]="selectedSport" [large]="true"></app-game-pick-card>
      <button type="button" (click)="gameListOpen = true" class="qs-btn qs-btn-secondary mt-3 w-full">Change game</button>
    </div>
  } @else {
    @if (espnGames().length > 10) {
      <div class="mt-2">
        <div class="qs-search">
          <ng-icon name="heroMagnifyingGlass" class="qs-search-icon" aria-hidden="true"></ng-icon>
          <input
            type="search"
            aria-label="Search teams"
            [(ngModel)]="espnGameSearch"
            (keydown.enter)="$event.preventDefault()"
            placeholder="Search teams"
            autocomplete="off"
          />
        </div>
      </div>
    }
    <div class="qs-canvas mt-3 min-h-40 flex-1 overflow-y-auto rounded-inner p-2 max-sm:flex-none max-sm:overflow-visible">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        @for (game of filteredEspnGames(); track game.id) {
          <button
            type="button"
            (click)="selectEspnGame(game.id)"
            [attr.aria-pressed]="selectedEspnGameId === game.id"
            [attr.aria-label]="game.awayTeamFull + ' at ' + game.homeTeamFull"
            class="rounded-inner border bg-qs-panel px-3 pb-3 pt-2.5 text-left transition-colors"
            [class]="selectedEspnGameId === game.id ? 'border-qs-accent outline outline-2 -outline-offset-2 outline-qs-accent' : 'border-qs-line hover:border-qs-line-strong'"
          >
            <app-game-pick-card [game]="game" [sport]="selectedSport" [large]="true"></app-game-pick-card>
          </button>
        }
      </div>
    </div>
  }
</section>
        </div>
      }
      @case (2) {
        <div class="flex flex-col gap-6" animate.enter="qs-tab-in">
          <h2 id="create-step-heading" tabindex="-1" class="sr-only">Board</h2>
          <section>
  <h3 class="qs-label text-qs-muted">Board size</h3>
  <div class="mt-2 flex flex-wrap gap-2">
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
          <section>
  <h3 class="qs-label text-qs-muted">Points per square</h3>
  <div class="mt-2 grid grid-cols-5 gap-2">
    @for (price of pricePresets; track price) {
      <button
        type="button"
        class="qs-tab px-0"
        [attr.aria-pressed]="newGamePrice === price"
        (click)="selectPrice(price)"
      >
        {{ price === 0 ? '0' : price + ' pts' }}
      </button>
    }
  </div>
  <input
    type="number"
    [(ngModel)]="customPrice"
    (ngModelChange)="onCustomPriceChange()"
    placeholder="Custom points"
    aria-label="Custom points per square"
    min="0"
    class="qs-input mt-2"
  />
</section>
      @if (squareLimitAllowed) {
        <app-max-squares-field [value]="newGameMaxSquares" (valueChange)="newGameMaxSquares = $event"></app-max-squares-field>
      } @else {
        <p class="text-sm text-qs-muted"><span class="qs-label mr-2 text-qs-ink">Limit squares per player</span>Comes with the Season Pass.</p>
      }
      <p class="truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">{{ summaryLine() }}</p>
        </div>
      }
      @case (3) {
        <div class="flex flex-col gap-6" animate.enter="qs-tab-in">
          <h2 id="create-step-heading" tabindex="-1" class="sr-only">Scoring</h2>
          <p class="qs-label truncate text-qs-muted">{{ summaryLine() }}</p>
          <section class="flex flex-col gap-6">
  <div>
  <h3 class="qs-label text-qs-muted">Quarter split</h3>
  @if (!customSplitsAllowed) {
    <p class="mt-2 text-sm text-qs-muted">
      <span class="font-mono tabular-nums text-qs-ink">20 / 20 / 20 / 40</span> · Custom splits come with the Season Pass.
    </p>
  } @else {
  <div class="mt-2 flex flex-wrap gap-2">
    @for (preset of splitPresets; track preset.id) {
      <button type="button" class="qs-tab px-3" [attr.aria-pressed]="newGameActivePreset() === preset.id" (click)="applyNewGameSplitPreset(preset.split)">{{ preset.label }}</button>
    }
    <button type="button" class="qs-tab px-3" [attr.aria-pressed]="newGameActivePreset() === 'custom'" (click)="newGameSplitCustomOpen = true">Custom</button>
  </div>
  @if (newGameSplitCustomOpen || newGameActivePreset() === 'custom') {
    <div class="mt-2 grid grid-cols-4 gap-2">
      @for (q of quarters; track q.key) {
        <div>
          <label [for]="'new-split-' + q.key" class="qs-label mb-2 block text-qs-muted">{{ q.label }}</label>
          <input [id]="'new-split-' + q.key" type="number" min="0" max="100" step="0.5" [(ngModel)]="newGameSplitPct[q.key]" class="qs-input px-2 text-center tabular-nums" />
        </div>
      }
    </div>
  }
  @if (!newGameSplitValid()) {
    <p class="mt-2 text-xs tabular-nums text-qs-bad">{{ newGameSplitText() }} · Must total 100% ({{ newGameSplitRemaining() }} left)</p>
  }
  }
  </div>
  <app-empty-quarter-rule class="[&_.qs-label]:text-qs-muted" name="new-empty-quarter-rule" [(value)]="newGameEmptyRule"></app-empty-quarter-rule>
</section>
        </div>
      }
      @case (4) {
        <div class="flex flex-col gap-8" animate.enter="qs-tab-in">
          <h2 id="create-step-heading" tabindex="-1" class="sr-only">Details</h2>
          <p class="qs-label truncate text-qs-muted">{{ summaryLine() }}</p>
          <section>
            <div class="space-y-5">
        <div>
          <label for="new-game-name" class="qs-label mb-2 block text-qs-muted">Game name <span class="normal-case tracking-normal">· Required</span></label>
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
            <p class="mt-2 text-sm text-qs-bad">Give your game a name.</p>
          } @else if (!newGameName.trim()) {
            <p class="mt-2 text-xs text-qs-muted">Name your game to create it.</p>
          }
        </div>
        <div>
          <div>
            <label for="new-game-host-note" class="qs-label mb-2 block text-qs-muted">Note from the host <span class="normal-case tracking-normal">(optional)</span></label>
            <input id="new-game-host-note" type="text" [(ngModel)]="newGameHostNote" maxlength="140" placeholder="Rules, deadline, how to send your entry" class="qs-input" />
          </div>
          <div class="mt-5">
            <label for="new-game-manager" class="qs-label mb-2 block text-qs-muted">Co-host <span class="normal-case tracking-normal">(optional)</span></label>
            <input id="new-game-manager" type="email" [(ngModel)]="newGamePaymentManager" placeholder="their@email.com" class="qs-input" />
            <p class="mt-2 text-xs text-qs-muted">A co-host can help manage players.</p>
          </div>
        </div>
            </div>
          </section>
      @if (openBoardsAllowed || (selectedSport !== 'custom' && selectedEspnGame())) {
      <div class="divide-y divide-qs-line border-t border-qs-line">
      @if (openBoardsAllowed) {
        <div class="flex items-start justify-between gap-4 py-5 first:pt-5">
          <div class="min-w-0">
            <p class="qs-label mb-2 text-qs-ink">Show in my open boards</p>
            <p class="text-xs text-qs-muted">Players on your other boards can join this one.</p>
            <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">{{ newGameName || 'Your board' }} · Points per square: {{ newGamePrice }} · 0/{{ newGameBoardSize }} taken</p>
          </div>
          <app-toggle [checked]="newGameShowInOpenBoards" (onChange)="newGameShowInOpenBoards = $event"></app-toggle>
        </div>
      }

  @if (selectedSport !== 'custom' && selectedEspnGame()) {
    @if (autoManageAllowed) {
      <div class="py-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="qs-label mb-2 text-qs-ink">Auto-lock and draw</p>
            <p class="text-xs text-qs-muted">5 minutes after kickoff, we lock the board and draw the numbers for you.</p>
            @if (newGameAutoManage && autoRunText()) {
              <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">Locks {{ autoRunText() }}</p>
            }
              <details class="mt-1 text-xs text-qs-muted"><summary class="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">How it works</summary><p class="pb-1">If the board is not full it first moves to 50 or 25 squares (squares are shuffled, each player keeps their count). Players can pick until then. Cancel any time before it runs.</p></details>
          </div>
          <app-toggle [checked]="newGameAutoManage" (onChange)="newGameAutoManage = $event; autoManageTouched = true"></app-toggle>
        </div>
      </div>
    } @else {
      <p class="py-5 text-sm text-qs-muted"><span class="qs-label mr-2 text-qs-ink">Auto-lock and draw</span>Comes with the Season Pass.</p>
    }
  }
      </div>
      }
        </div>
      }
    }
  </div>

  <div class="flex items-center gap-2 border-t border-qs-line px-4 py-3 sm:px-6">
    @if (step() === 1) {
      <button type="button" (click)="cancelled.emit()" class="qs-btn qs-btn-ghost px-3 text-qs-muted">Cancel</button>
    } @else {
      <button type="button" (click)="goTo(step() - 1)" class="qs-btn qs-btn-ghost px-3 text-qs-muted">Back</button>
    }
    <div class="ml-auto flex items-center gap-2">
      @if (step() < stepTitles.length) {
        @if (canCreate()) {
          <button type="button" (click)="submit()" [disabled]="isCreating" class="qs-btn qs-btn-secondary px-4 disabled:opacity-45">Create</button>
        }
        <button type="submit" [disabled]="step() === 3 && customSplitsAllowed && !newGameSplitValid()" class="qs-btn qs-btn-primary px-4 disabled:opacity-45">Next</button>
      } @else {
        <button type="submit" [disabled]="isCreating || !newGameName.trim()" [attr.aria-busy]="isCreating" class="qs-btn qs-btn-primary min-w-28 disabled:opacity-45 sm:min-w-40">
          @if (isCreating) {
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Creating
          } @else {
            Create
          }
        </button>
      }
    </div>
  </div>
  </form>
`
})
export class CreateGameFormComponent implements OnChanges, OnInit {
  @Input() customSplitsAllowed = false;
  @Input() isCreating = false;
  /** Hosts who can run several boards get the Show in my open boards switch. */
  @Input() openBoardsAllowed = false;
  /** Season Pass hosts get the Auto-manage switch. */
  @Input() autoManageAllowed = false;
  /** Auto-manage starts switched on for a new board unless the host turned it off in the profile menu. */
  @Input() autoManageDefault = true;
  /** Season Pass hosts can limit squares per player. */
  @Input() squareLimitAllowed = false;
  @Output() cancelled = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<CreateGameSubmit>();

  boardSizeOptions: { value: BoardSize; label: string; description: string }[] = [
    { value: 100, label: '100 squares', description: '10×10 grid (classic)' },
    { value: 50, label: '50 squares', description: '5×10 grid' },
    { value: 25, label: '25 squares', description: '5×5 grid' }
  ];
  /** The steps of the form; Create works from any of them. */
  readonly stepTitles = ['Your game', 'Board', 'Scoring', 'Details'];
  step = signal(1);
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
  newGameShowInOpenBoards = false;
  newGameAutoManage = false;
  /** Once the host flips the switch, the plan and profile default stop moving it. */
  autoManageTouched = false;
  newGameMaxSquares: number | null = null;
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
    { value: 'ncaaf', label: 'NCAA' },
    { value: 'ufl', label: 'UFL' },
    { value: 'nba', label: 'NBA' },
    { value: 'wnba', label: 'WNBA' },
    { value: 'afl', label: 'AFL' },
    { value: 'custom', label: 'Custom' }
  ];

  private autoName = '';
  private espnService = inject(EspnService);
  private sanitizer = inject(SanitizationService);

  /** The form is mounted before the plan and the profile switch have loaded, so the default follows them until the host chooses. */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.autoManageTouched && (changes['autoManageAllowed'] || changes['autoManageDefault'])) {
      this.newGameAutoManage = this.autoManageAllowed && this.autoManageDefault;
    }
  }

  async ngOnInit(): Promise<void> {
    if (!this.autoManageTouched) this.newGameAutoManage = this.autoManageAllowed && this.autoManageDefault;
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

  canCreate(): boolean {
    return !!this.newGameName.trim() && this.newGameSplitValid();
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

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.step() === this.stepTitles.length) {
      if (!this.isCreating && this.newGameName.trim()) this.submit();
    } else if (!(this.step() === 3 && this.customSplitsAllowed && !this.newGameSplitValid())) {
      this.goTo(this.step() + 1);
    }
  }

  onCustomPriceChange(): void {
    if (this.customPrice !== null && this.customPrice >= 0) {
      this.newGamePrice = this.customPrice;
    }
  }

  autoRunText(): string {
    return autoRunLabel(this.selectedEspnGame()?.date);
  }

  selectedEspnGame(): EspnGame | undefined {
    return this.espnGames().find(g => g.id === this.selectedEspnGameId);
  }

  selectEspnGame(gameId: string): void {
    this.selectedEspnGameId = gameId;
    this.gameListOpen = false;
    const game = this.selectedEspnGame();
    if (game && this.selectedSport !== 'custom' && (!this.newGameName.trim() || this.newGameName === this.autoName)) {
      this.autoName = `${game.awayTeam} @ ${game.homeTeam} squares`;
      this.newGameName = this.autoName;
    }
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

  /** Moves to a step (1 to 4) and puts focus on its heading for keyboard and screen reader users. */
  goTo(next: number): void {
    const target = Math.min(this.stepTitles.length, Math.max(1, next));
    if (target === this.step()) return;
    this.step.set(target);
    setTimeout(() => {
      const name = document.getElementById('new-game-name');
      (target === this.stepTitles.length && name && !this.newGameName.trim() ? name : document.getElementById('create-step-heading'))?.focus({ preventScroll: true });
    });
  }

  /** One line of context above the optional steps, for example "SF @ KC · 100 squares · 10 pts". */
  summaryLine(): string {
    const game = this.selectedSport === 'custom'
      ? [this.customAwayTeam.trim(), this.customHomeTeam.trim()].filter(Boolean).join(' @ ')
      : (() => { const g = this.selectedEspnGame(); return g ? `${g.awayTeam} @ ${g.homeTeam}` : ''; })();
    return [game, `${this.newGameBoardSize} squares`, this.newGamePrice === 0 ? 'No points' : `${this.newGamePrice} pts`].filter(Boolean).join(' · ');
  }

  submit(): void {
    const draft = this.toDraft();
    const result = buildCreateGameValues(draft, this.sanitizer, this.customSplitsAllowed, this.squareLimitAllowed);
    if (!result.ok) {
      if (result.reason === 'name') {
        this.gameNameError.set(true);
        this.goTo(this.stepTitles.length);
        setTimeout(() => this.showField('new-game-name'));
      } else {
        // The quarter split is wrong: show it, with its red line, on the Scoring step.
        this.goTo(3);
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
    this.newGameShowInOpenBoards = draft.showInOpenBoards;
    this.newGameAutoManage = draft.autoManage;
    this.newGameMaxSquares = draft.maxSquaresPerPlayer ?? null;
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
      autoManage: this.autoManageAllowed && this.newGameAutoManage,
      maxSquaresPerPlayer: this.squareLimitAllowed ? this.newGameMaxSquares : null,
      boardSize: this.newGameBoardSize,
      customAway: this.customAwayTeam,
      customHome: this.customHomeTeam,
      customPrice: this.customPrice,
      emptyRule: this.newGameEmptyRule,
      espnGame: game ? { id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, kickoffAt: Number.isFinite(Date.parse(game.date)) ? Date.parse(game.date) : undefined } : null,
      hostNote: this.newGameHostNote,
      manager: this.newGamePaymentManager,
      name: this.newGameName,
      price: this.newGamePrice,
      showInOpenBoards: this.openBoardsAllowed && this.newGameShowInOpenBoards,
      splitPct: { ...this.newGameSplitPct },
      sport: this.selectedSport
    };
  }
}
