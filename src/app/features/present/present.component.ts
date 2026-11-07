import { Component, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewEncapsulation, computed, inject, signal } from '@angular/core';
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
import { GameBoardComponent } from '../super-bowl-squares/components/game-board/game-board.component';
import { PLAYER_COLORS, normalizePlayerColors } from '../super-bowl-squares/utils/player-colors';

const PIN_MS = 30000;
/** Phones and portrait tablets: the TV layout is not built for them. Landscape phones top out near 930px. */
const SMALL_SCREEN_QUERY = '(max-width: 959px)';
const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;

@Component({
  selector: 'app-present',
  imports: [GameBoardComponent, NgIconComponent],
  providers: [provideIcons({ heroClock })],
  templateUrl: './present.component.html',
  styleUrl: './present.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PresentComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly espn = inject(EspnService);
  private readonly gameService = inject(GameService);
  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
      if (colors[name]) continue;
      const used = Object.values(colors);
      colors[name] = PLAYER_COLORS.find(c => !used.includes(c)) ?? PLAYER_COLORS[used.length % PLAYER_COLORS.length];
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
  protected readonly showHelp = signal<boolean>(false);
  protected readonly showTimer = signal<boolean>(false);
  /** Host buttons show on any movement, then fade after a few seconds. */
  protected readonly controlsVisible = signal<boolean>(true);
  /** True on /tv/:token: a TV with no sign-in, rotating the boards the host chose, at the speed the host chose. */
  protected readonly kiosk = signal<boolean>(false);
  protected readonly kioskOff = signal<boolean>(false);
  protected readonly hasOfficeLink = signal<boolean>(false);
  protected readonly tooSmall = signal<boolean>(false);
  /** How many boards the signed-in host has: rotation needs two or more. */
  protected readonly boardCount = signal<number>(0);
  protected readonly slideDir = signal<'left' | 'right'>('right');

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
    this.boardIds = await this.gameService.getUserGameIds(user.uid);
    this.boardCount.set(this.boardIds.length);
    this.hasOfficeLink.set(!!(await this.gameService.getTvToken(user.uid)));
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
      if (!this.showTimer() && !this.showHelp()) this.controlsVisible.set(false);
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

  protected boardRows(g: GameData): number {
    return this.rows(g);
  }

  protected claimed(): number {
    return Object.keys(this.game()?.selectedSquares ?? {}).length;
  }

  protected async copyLink(): Promise<void> {
    const url = this.gameService.getTvLink(this.gameId());
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('TV link copied');
    } catch {
      this.toast.error('Could not copy. Open the board and copy the address bar.');
    }
  }

  protected exit(): void {
    this.router.navigate([this.gameId() && !this.rotating() ? '/game/' + this.gameId() : '/dashboard']);
  }

  protected leaderSquare(): string | null {
    const g = this.game();
    return g?.isRandomized ? this.squareFor(g, this.latestScore(g)) : null;
  }

  protected winnerSquares(): string[] {
    const g = this.game();
    if (!g?.isRandomized) return [];
    return QUARTERS.flatMap(q => {
      const winner = g.winners?.[q];
      const key = winner && g.scores?.[q] ? this.squareFor(g, g.scores[q]) : null;
      return key && g.selectedSquares?.[key] === winner ? [key] : [];
    });
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

  /** Publish the boards and the chosen interval under the host's private token, and copy the address. */
  protected async copyOfficeLink(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user || user.isGuest) return;
    let url: string;
    try {
      const token = await this.gameService.saveTvLink(user.uid, this.boardIds, this.interval());
      this.hasOfficeLink.set(true);
      url = this.gameService.getOfficeTvLink(token);
    } catch (error) {
      console.error('[Present] Could not save the office TV link', (error as { code?: string })?.code ?? error);
      this.toast.error('Could not make the office link. Try again.');
      return;
    }
    const boards = Math.min(this.boardIds.length, 20);
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success(`Office link copied: ${boards} boards, ${this.interval()}s each. Press it again after you change boards or the time.`);
    } catch {
      this.toast.error(`Could not copy. The link is ${url}`);
    }
  }

  /** The old address stops working and the next link gets a new token. */
  protected async turnOffOfficeLink(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user || user.isGuest) return;
    try {
      await this.gameService.removeTvLink(user.uid);
      this.hasOfficeLink.set(false);
      this.toast.success('Office link turned off.');
    } catch {
      this.toast.error('Could not turn the link off. Try again.');
    }
  }

  /** The clock button: show the interval buttons, or say why rotation is not available. */
  protected toggleTimer(): void {
    if (this.boardCount() < 2) {
      this.toast.warning('Rotation needs two or more boards.');
      return;
    }
    this.showTimer.set(!this.showTimer());
  }

  /** Stop rotating and stay on the board that is showing. */
  protected stopRotation(): void {
    this.stopTimer();
    this.rotating.set(false);
  }

  /** Long game names shrink to fit the title space (never above the normal size). */
  protected titleFont(): string | null {
    const length = (this.game()?.name ?? '').length;
    if (!length) return null;
    return `min(2.25rem, max(1.1rem, ${(182 / length).toFixed(1)}cqw))`;
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
    const paid = new Set(this.game()?.paidPlayers ?? []);
    return new Set(Object.values(this.game()?.selectedSquares ?? {}).filter(p => paid.has(p))).size;
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

  private matches(score: number, stored: number | null, paired: boolean): boolean {
    const digit = score % 10;
    return paired ? Math.floor(digit / 2) === stored : digit === stored;
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

  private rows(g: GameData): number {
    return getBoardDimensions(g.boardSize ?? 100).rows;
  }

  private squareFor(g: GameData, s: { home: number; away: number }): string | null {
    const row = g.awayNumbers.findIndex(n => this.matches(s.away, n, this.rows(g) === 5));
    const col = g.homeNumbers.findIndex(n => this.matches(s.home, n, this.cols(g) === 5));
    return row === -1 || col === -1 ? null : `${row}-${col}`;
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
