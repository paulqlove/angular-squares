import { MaxSquaresFieldComponent } from '../../components/ui/max-squares-field/max-squares-field.component';
import { autoRunLabel } from '../../core/utils/auto-manage';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmptyQuarterRuleComponent } from '../../components/ui/empty-quarter-rule/empty-quarter-rule.component';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../../core/plans';
import { EspnGame, EspnService, SportType } from '../../core/services/espn.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import type { BoardSize } from '../../core/services/game.service';
import {
  CreateGameDraft, CreateGameValues, buildCreateGameValues, emptyDraft, loadCreateDraft, splitToTenths
} from '../../core/utils/create-game-draft';
import { GameGroup, GroupChoice, inGroup } from '../../core/utils/game-groups';
import { fillCoHost } from '../../core/utils/group-cohost';
import { CreateGameCoHostComponent } from './create-game-cohost.component';
import { SPLIT_QUARTERS, splitLabel, splitPresetId, splitRemaining } from '../../core/utils/split-edit';
import { CreateGameFooterComponent } from './create-game-footer.component';
import {
  BOARD_SIZE_OPTIONS, PRICE_PRESETS, matchup, openBoardPreview, stubGame, formatSummaryLine
} from './create-game-form.utils';
import { CreateGameOptionsComponent } from './create-game-options.component';
import { CreateGamePickComponent } from './create-game-pick.component';

export interface CreateGameSubmit {
  draft: CreateGameDraft;
  values: CreateGameValues;
  /** Where the Group picker was left (Season Pass). Missing when the picker didn't show. */
  group?: GroupChoice;
}

/**
 * The "Set up your board" fields, shared by the dashboard dialog and the signed-out /create page.
 * It never touches Firebase: the host decides what happens on submit.
 */
@Component({
  selector: 'app-create-game-form',
  imports: [
    MaxSquaresFieldComponent, FormsModule, EmptyQuarterRuleComponent,
    CreateGamePickComponent, CreateGameOptionsComponent, CreateGameFooterComponent, CreateGameCoHostComponent
  ],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './create-game-form.component.html'
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
  /** Season Pass hosts get the Group picker on Details, with their groups. */
  @Input() groupsAllowed = false;
  @Input() groups: GameGroup[] = [];
  @Output() cancelled = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<CreateGameSubmit>();

  readonly boardSizeOptions = BOARD_SIZE_OPTIONS;
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
  /** Starts on No group. Creating before Details files the board in No group. */
  newGameGroup: GroupChoice = { groupId: null };
  newGameName = '';
  newGamePaymentManager = '';
  newGamePrice = 10;
  newGameSplitCustomOpen = false;
  newGameSplitPct: QuarterSplit = { q1: 20, q2: 20, q3: 20, q4: 40 };
  readonly pricePresets = PRICE_PRESETS;
  readonly quarters = SPLIT_QUARTERS;
  selectedEspnGameId = '';
  selectedSport: SportType | 'custom' = 'nfl';
  readonly splitPresets = SPLIT_PRESETS;

  private autoName = '';
  /** The co-host a group pick put in the field, and that group's name; null once the host types their own. */
  private coHostFill: { email: string; group: string } | null = null;
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

  canCreate(): boolean {
    return !!this.newGameName.trim() && this.newGameSplitValid();
  }

  newGameActivePreset(): string {
    return splitPresetId(this.newGameSplitPct);
  }

  newGameSplitRemaining(): string {
    return splitRemaining(this.newGameSplitPct);
  }

  newGameSplitText(): string {
    return splitLabel(this.newGameSplitPct);
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

  /** The picker is on a group, so Show in my open boards is locked on. */
  grouped(): boolean {
    return inGroup(this.newGameGroup);
  }

  /** Under Co-host: where the email came from while a group's co-host is in the field. */
  coHostHint(): string {
    return this.coHostFill && this.newGamePaymentManager === this.coHostFill.email
      ? `From ${this.coHostFill.group}. Change it for just this game.`
      : 'A co-host can help manage players.';
  }

  /**
   * A game in a group always shows in its More tab; No group keeps the switch as it is. The group's co-host (or a new
   * group's) fills Co-host unless the host typed one first (K3).
   */
  pickGroup(choice: GroupChoice): void {
    if (inGroup(choice)) this.newGameShowInOpenBoards = true;
    this.newGameGroup = choice;
    const group = choice.groupId ? this.groups.find(g => g.id === choice.groupId) : undefined;
    const source = group
      ? { email: group.coHost?.email, name: group.name }
      : { email: choice.newCoHost?.trim() || undefined, name: choice.newName?.trim() || 'your new group' };
    const next = fillCoHost(this.newGamePaymentManager, this.coHostFill?.email ?? null, source.email);
    this.newGamePaymentManager = next.value;
    this.coHostFill = next.filled ? { email: next.filled, group: source.name } : null;
  }

  /** A schedule game is picked (not custom teams), so Auto-lock and draw applies. */
  schedulePicked(): boolean {
    return this.selectedSport !== 'custom' && !!this.selectedEspnGame();
  }

  openBoardPreviewLine(): string {
    return openBoardPreview(this.newGameName, this.newGamePrice, this.newGameBoardSize);
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
    const game = this.selectedEspnGame();
    const teams = this.selectedSport === 'custom'
      ? matchup(this.customAwayTeam, this.customHomeTeam)
      : game ? `${game.awayTeam} @ ${game.homeTeam}` : '';
    return formatSummaryLine({ matchup: teams, boardSize: this.newGameBoardSize, price: this.newGamePrice });
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
    this.submitted.emit({ draft, values: result.values, ...(this.groupsAllowed ? { group: this.newGameGroup } : {}) });
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
    this.espnGames.update(list => [stubGame(game), ...list]);
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
