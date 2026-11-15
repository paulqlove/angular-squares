import { Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewEncapsulation, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroClock } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { GameData, GameService, getBoardDimensions } from '../../core/services/game.service';
import { boardArrowStep } from '../../core/utils/board-keys';
import { isGameOver, quarterLabel } from '../../core/utils/quarter-label';
import { EspnGame, EspnService } from '../../core/services/espn.service';
import { confirmedPlayers } from '../../core/utils/paid-squares';
import { TeamLogoService } from '../../core/services/team-logo.service';
import { GameBoardComponent } from '../super-bowl-squares/components/game-board/game-board.component';
import { PLAYER_COLORS, normalizePlayerColors } from '../super-bowl-squares/utils/player-colors';
import { BoardLayout, nextPlayerColor, quarterWins, squareForScore } from '../super-bowl-squares/utils/board-math';
import { QuarterWin, quarterLabels } from '../super-bowl-squares/utils/quarter-labels';
import { GroupMenuComponent } from '../dashboard/components/dashboard-groups/group-menu.component';
import { PresentGroupsService } from './present-groups.service';
import { PresentTvLinkService } from './present-tv-link.service';

const PIN_MS = 30000;
/** Phones and portrait tablets: the TV layout is not built for them. Landscape phones top out near 930px. */
const SMALL_SCREEN_QUERY = '(max-width: 959px)';
const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;

@Component({
  selector: 'app-present',
  imports: [GameBoardComponent, GroupMenuComponent, NgIconComponent],
  providers: [PresentGroupsService, PresentTvLinkService, provideIcons({ heroClock })],
  templateUrl: './present.component.html',
  styleUrl: './present.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PresentComponent implements OnInit, OnDestroy {
  constructor() {
    // Track the floating host controls' width, so the title leaves room for them (see the header in the template).
    effect(onCleanup => {
      const el = this.controlsRef()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.controlsWidth.set(el.offsetWidth));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  private readonly auth = inject(AuthService);
  private readonly espn = inject(EspnService);
  private readonly gameService = inject(GameService);
  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly presentGroups = inject(PresentGroupsService);
  protected readonly tvLink = inject(PresentTvLinkService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamLogoService = inject(TeamLogoService);
  private readonly toast = inject(ToastService);

  protected readonly intervals: number[] = [10, 20, 30, 60];
  protected readonly quarters = QUARTERS;
  protected readonly game = signal<GameData | null>(null);
  /** ESPN's own status for linked boards that have no espnLive node (the browser poller does not write one). */
  private readonly espnGame = signal<EspnGame | null>(null);
  protected readonly gameId = signal<string>('');
  protected readonly colors = computed<{ [name: string]: string }>(() => {
    const g = this.game();
    if (!g) return {};
    const colors = normalizePlayerColors(g.playerColors ?? {});
    for (const name of Object.values(g.selectedSquares ?? {})) {
      if (!colors[name]) colors[name] = nextPlayerColor(colors, PLAYER_COLORS);
    }
    return colors;
  });
  protected readonly isHost = computed(() => {
    if (this.kiosk()) return false;
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });
  protected readonly interval = signal<number>(20);
  protected readonly qr = signal<string>('');
  protected readonly rotating = signal<boolean>(false);
  /** The group menu is open: the host controls stay on screen meanwhile. */
  protected readonly groupMenuOpen = signal<boolean>(false);
  protected readonly showTimer = signal<boolean>(false);
  /** Host buttons show on any movement, then fade after a few seconds. */
  protected readonly controlsVisible = signal<boolean>(true);
  /** Width of the host controls in pixels, 0 when there are none (the TV link shows no controls). */
  protected readonly controlsWidth = signal<number>(0);
  /** True on /tv/:token: a TV with no sign-in, rotating the boards the host chose, at the speed the host chose. */
  protected readonly kiosk = signal<boolean>(false);
  protected readonly kioskOff = signal<boolean>(false);
  protected readonly tooSmall = signal<boolean>(false);
  /** How many boards the signed-in host has: rotation needs two or more. */
  protected readonly boardCount = signal<number>(0);
  protected readonly slideDir = signal<'left' | 'right'>('right');

  private readonly controlsRef = viewChild<ElementRef<HTMLElement>>('controls');
  private readonly titleRef = viewChild<ElementRef<HTMLElement>>('title');
  /** The title's font size when the timer opened, kept while it is open so the title truncates instead of shrinking. */
  private titleFontWhileTimerOpen: string | null = null;
  private boardIds: string[] = [];
  private index = 0;
  private lastScore = '';
  private pinnedUntil = 0;
  private skips = 0;
  private screenQuery: MediaQueryList | null = null;
  private readonly onScreenChange = (event: MediaQueryListEvent): void => this.tooSmall.set(event.matches);
  private hideControlsTimer: ReturnType<typeof setTimeout> | null = null;
  private linkSub: Subscription | null = null;
  private sub: Subscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private espnTimer: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.screenQuery = window.matchMedia(SMALL_SCREEN_QUERY);
    this.tooSmall.set(this.screenQuery.matches);
    this.screenQuery.addEventListener('change', this.onScreenChange);
    this.espnTimer = setInterval(() => this.refreshEspn(), 30000);
    this.pokeControls();
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.startKiosk(token);
      return;
    }
    const id = this.route.snapshot.paramMap.get('gameId');
    if (id) this.open(id);
    await this.auth.waitForAuthReady();
    const user = this.auth.currentUser();
    if (!user || user.isGuest) {
      if (!id) this.router.navigate(['/']);
      return;
    }
    await this.presentGroups.load(user.uid, await this.gameService.getUserGameIds(user.uid), id ?? undefined);
    this.boardIds = this.presentGroups.boardIds();
    this.boardCount.set(this.boardIds.length);
    await this.tvLink.load(user.uid);
    if (id) {
      this.index = this.boardIds.indexOf(id);
      return;
    }
    if (!this.boardIds.length) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.rotating.set(true);
    this.open(this.boardIds[0]);
    this.startTimer();
  }

  @HostListener('document:mousemove')
  @HostListener('document:click')
  @HostListener('document:touchstart')
  pokeControls(): void {
    this.controlsVisible.set(true);
    if (this.hideControlsTimer) clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = setTimeout(() => {
      if (!this.showTimer() && !this.groupMenuOpen()) this.controlsVisible.set(false);
    }, 5000);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    this.pokeControls();
    const dir = boardArrowStep(event);
    if (dir) this.step(dir);
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.espnTimer) clearInterval(this.espnTimer);
    this.screenQuery?.removeEventListener('change', this.onScreenChange);
    if (this.hideControlsTimer) clearTimeout(this.hideControlsTimer);
    this.linkSub?.unsubscribe();
    this.sub?.unsubscribe();
    this.gameService.unsubscribe();
  }

  /** Both teams' logos for the board caption: our NFL table, or ESPN's logo for other leagues. */
  protected teamLogos(g: GameData): { away: string | null; home: string | null } {
    const t = this.teamLogoService.teams(g, this.espnGame());
    return { away: t.away.logo, home: t.home.logo };
  }

  protected claimed(): number {
    return Object.keys(this.game()?.selectedSquares ?? {}).length;
  }

  protected copyLink(): void {
    void this.tvLink.copyBoardLink(this.gameId());
  }

  protected exit(): void {
    this.router.navigate([this.gameId() && !this.rotating() ? '/game/' + this.gameId() : '/dashboard']);
  }

  protected leaderSquare(): string | null {
    const g = this.game();
    return g?.isRandomized ? squareForScore(this.layout(g), this.latestScore(g)) : null;
  }

  protected winnerSquares(): string[] {
    return this.quarterWins().map(w => w.key);
  }

  /** Quarter tab text on each winning square ("Q1", "FINAL", "Q1 Q3"), as on the game page. */
  protected winnerQuarterLabels(): Record<string, string> {
    return quarterLabels(this.quarterWins());
  }

  private quarterWins(): QuarterWin[] {
    const g = this.game();
    return g?.isRandomized && g.scores ? quarterWins(this.layout(g), g.scores, g.winners ?? {}) : [];
  }

  /** Same rule as the game page: see isGameOver in core/utils/quarter-label.ts. */
  protected gameOver(): boolean {
    const g = this.game();
    if (!g) return false;
    return isGameOver({
      espnEventId: g.espnEventId,
      espnLive: g.espnLive,
      linkedStatus: this.espnGame()?.status,
      q4: g.scores?.q4,
      q4Winner: g.winners?.['q4']
    });
  }

  /** The score that won a quarter, e.g. "PHI 3 – WSH 0". Shown only once the quarter has a winner. */
  protected winningScore(quarter: string): string {
    const g = this.game();
    const score = g?.scores?.[quarter as 'q1'];
    if (!g || !score) return '';
    return `${g.awayTeam || 'Away'} ${score.away} – ${g.homeTeam || 'Home'} ${score.home}`;
  }

  /**
   * One font size for all four score lines, so long team names or long winner names make the text smaller
   * instead of cutting it off (never above the normal size). Sizes are relative to the Winners card width:
   * what is left after the label and the winner badge is divided by the longest line.
   */
  protected scoreFont(): string | null {
    const g = this.game();
    const longest = Math.max(...this.quarters.map(q => this.winningScore(q).length));
    if (!g || !longest) return null;
    const longestName = Math.max(0, ...this.quarters.map(q => (g.winners?.[q] ?? '').length));
    const badge = `min(50cqw, calc(min(42cqw, ${(longestName * 1.125).toFixed(2)}rem) + 1.5rem))`;
    return `clamp(0.7rem, calc((85cqw - ${badge}) / ${(longest * 0.56).toFixed(2)}), 1.5rem)`;
  }

  /** Winner names shrink when one is long, so the badge is not cut off (never above the normal size). */
  protected badgeFont(): string | null {
    const g = this.game();
    const longestName = Math.max(0, ...this.quarters.map(q => (g?.winners?.[q] ?? '').length));
    if (!longestName) return null;
    return `clamp(0.9rem, calc(70cqw / ${longestName}), 1.875rem)`;
  }

  protected label(quarter: string): string {
    return quarterLabel(quarter, this.gameOver());
  }

  protected isLive(): boolean {
    const g = this.game();
    return (g?.espnLive ?? this.espnGame())?.status === 'in';
  }

  protected live(): { home: number; away: number; status: string } | null {
    const g = this.game();
    if (!g) return null;
    const e = g.espnLive ?? this.espnGame();
    if (e) {
      const status = e.status === 'pre' ? 'Pregame' : e.completed ? 'Final' : `${e.period > 4 ? 'OT' : 'Q' + e.period} ${e.clock}`;
      return { home: e.homeScore, away: e.awayScore, status };
    }
    const s = this.latestScore(g);
    return { home: s.home, away: s.away, status: '' };
  }

  protected openSquares(): number {
    const g = this.game();
    return g ? this.total(g) - this.claimed() : 0;
  }

  /** Start rotating through the host's boards from the board on screen. */
  protected startRotation(seconds: number): void {
    if (this.boardIds.length < 2) return;
    this.interval.set(seconds);
    this.rotating.set(true);
    this.showTimer.set(false);
    this.skips = this.boardIds.length - 1;
    this.startTimer();
  }

  protected copyRotationLink(): void {
    const user = this.auth.currentUser();
    if (!user || user.isGuest) return;
    void this.tvLink.copyRotationLink(user.uid, { boardIds: this.boardIds, groupName: this.presentGroups.pickedName(), seconds: this.interval() });
  }

  protected turnOffRotationLink(): void {
    const user = this.auth.currentUser();
    if (user && !user.isGuest) void this.tvLink.turnOff(user.uid);
  }

  /** The clock button: show the interval buttons, or say why rotation is not available. */
  protected toggleTimer(): void {
    if (this.boardCount() < 2) {
      this.toast.warning('Rotation needs two or more boards.');
      return;
    }
    if (!this.showTimer()) this.titleFontWhileTimerOpen = this.measuredTitleFont();
    this.showTimer.set(!this.showTimer());
  }

  /**
   * Shows one group's boards, or all of them: jumps to the group's first board and keeps the interval, rotating
   * within the group when rotation is on. A group with one board stops rotation (it needs two or more).
   */
  protected pickGroup(groupId: string | null): void {
    const row = this.presentGroups.rows().find(r => r.id === groupId);
    if (row && !row.count) {
      this.toast.warning(`${row.name} has no boards yet.`);
      return;
    }
    this.presentGroups.pickedId.set(groupId);
    this.boardIds = this.presentGroups.boardIds();
    this.boardCount.set(this.boardIds.length);
    if (this.boardIds.length < 2) {
      this.showTimer.set(false);
      this.stopRotation();
    }
    this.index = 0;
    this.skips = 0;
    this.slideDir.set('right');
    this.open(this.boardIds[0]);
    if (this.rotating()) this.startTimer();
    else this.location.replaceState('/present/' + this.boardIds[0]);
  }

  /** Stop rotating and stay on the board that is showing. */
  protected stopRotation(): void {
    this.stopTimer();
    this.rotating.set(false);
  }

  /** Long game names shrink to fit the title space (never above the normal size). While the timer is open the size holds. */
  protected titleFont(): string | null {
    if (this.showTimer() && this.titleFontWhileTimerOpen) return this.titleFontWhileTimerOpen;
    const length = (this.game()?.name ?? '').length;
    if (!length) return null;
    return `min(2.25rem, max(1.1rem, ${(182 / length).toFixed(1)}cqw))`;
  }

  protected rows(g: GameData): number {
    return getBoardDimensions(g.boardSize ?? 100).rows;
  }

  protected setInterval(seconds: number): void {
    this.interval.set(seconds);
    this.showTimer.set(false);
    this.startTimer();
  }

  protected total(g: GameData): number {
    return this.rows(g) * this.cols(g);
  }

  protected players(): number {
    return new Set(Object.values(this.game()?.selectedSquares ?? {})).size;
  }

  protected verified(): number {
    const game = this.game();
    return game ? confirmedPlayers(game.selectedSquares ?? {}, game.paidPlayers ?? [], game.paidSquares).size : 0;
  }

  private startKiosk(token: string): void {
    this.kiosk.set(true);
    this.linkSub = this.gameService.watchTvLink(token).subscribe(link => {
      if (!link) {
        this.kioskOff.set(true);
        this.stopTimer();
        this.sub?.unsubscribe();
        this.boardIds = [];
        this.boardCount.set(0);
        this.gameId.set('');
        this.game.set(null);
        this.espnGame.set(null);
        return;
      }
      this.kioskOff.set(false);
      const intervalChanged = link.interval !== this.interval();
      this.boardIds = link.boards;
      this.boardCount.set(link.boards.length);
      this.interval.set(link.interval);
      this.rotating.set(true);
      if (!this.gameId() || !link.boards.includes(this.gameId())) {
        this.index = 0;
        this.skips = 0;
        this.open(link.boards[0]);
      } else {
        this.index = link.boards.indexOf(this.gameId());
      }
      if (!this.timer || intervalChanged) this.startTimer();
    });
  }

  private advance(): void {
    if (this.boardIds.length < 2 || Date.now() < this.pinnedUntil) return;
    this.slideDir.set('right');
    this.index = (this.index + 1) % this.boardIds.length;
    this.skips = this.boardIds.length - 1;
    this.open(this.boardIds[this.index]);
  }

  private cols(g: GameData): number {
    return getBoardDimensions(g.boardSize ?? 100).cols;
  }

  private latestScore(g: GameData): { home: number; away: number } {
    for (const q of [...QUARTERS].reverse()) {
      const s = g.scores?.[q];
      if (s && (s.home > 0 || s.away > 0)) return s;
    }
    return { home: 0, away: 0 };
  }

  private measuredTitleFont(): string | null {
    const el = this.titleRef()?.nativeElement;
    return el ? getComputedStyle(el).fontSize : null;
  }

  private open(id: string): void {
    this.sub?.unsubscribe();
    this.gameId.set(id);
    this.lastScore = '';
    this.game.set(null);
    this.espnGame.set(null);
    this.makeQr(id);
    this.sub = this.gameService.subscribeToGame(id).subscribe(g => {
      if (!g) return;
      if (this.rotating() && this.skips > 0 && !this.lastScore && g.espnLive?.completed) {
        this.skips--;
        this.advance();
        return;
      }
      const s = this.latestScore(g);
      const key = `${s.home}-${s.away}-${g.espnLive?.period ?? 0}`;
      if (this.lastScore && key !== this.lastScore) this.pinnedUntil = Date.now() + PIN_MS;
      this.lastScore = key;
      this.game.set(g);
      if (!this.espnGame()) this.refreshEspn();
    });
  }

  private async makeQr(id: string): Promise<void> {
    // qrcode is CommonJS: production bundles expose it only as the default export
    const QRCode = (await import('qrcode')).default;
    this.qr.set(await QRCode.toDataURL(this.gameService.getShareableLink(id), { margin: 1, width: 400 }));
  }

  private refreshEspn(): void {
    const g = this.game();
    if (!g?.espnEventId || g.espnLive || this.espnGame()?.status === 'post') return;
    const id = this.gameId();
    this.espn
      .getGame(g.espnEventId, g.espnSport ?? 'nfl')
      .then(game => {
        if (this.gameId() === id) this.espnGame.set(game);
      })
      .catch(() => {});
  }

  /** The board as the shared winner math reads it (5-row or 5-column boards pair their digits). */
  private layout(g: GameData): BoardLayout {
    return {
      awayNumbers: g.awayNumbers,
      awayPaired: this.rows(g) === 5,
      homeNumbers: g.homeNumbers,
      homePaired: this.cols(g) === 5,
      selectedSquares: g.selectedSquares ?? {}
    };
  }

  private step(dir: number): void {
    const n = this.boardIds.length;
    if (n < 2 || this.index < 0) return;
    this.slideDir.set(dir > 0 ? 'right' : 'left');
    this.index = (this.index + dir + n) % n;
    this.skips = 0;
    const id = this.boardIds[this.index];
    this.open(id);
    if (this.rotating()) this.startTimer();
    else this.location.replaceState('/present/' + id);
  }

  private startTimer(): void {
    this.stopTimer();
    if (this.rotating()) this.timer = setInterval(() => this.advance(), this.interval() * 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
