import { Component, inject, ChangeDetectionStrategy, OnInit, signal, effect, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/services/auth.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { NflTeam, getTeamBySlug, NFL_TEAMS } from './teams-data';
import { TeamHelmetComponent } from '../../shared/team-helmet.component';
import { EspnService, EspnGame } from '../../core/services/espn.service';
import { SCHEDULE } from './schedule.generated';
import { ScheduledGame, formatKickoff } from './schedule.model';

@Component({
  selector: 'app-team-page',
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent, AuthModalComponent, TeamHelmetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>

      @if (team) {
        <article>
          <!-- Team Header -->
          <header
            class="relative -mx-4 -mt-4 mb-8 overflow-hidden px-6 py-10 sm:-mx-8 sm:rounded-2xl"
            [style.background]="'linear-gradient(135deg, ' + team.primaryColor + ' 0%, ' + team.secondaryColor + ' 100%)'"
          >
            <div class="relative z-10 flex items-center gap-6 ps-6">
              <app-team-helmet [color]="team.primaryColor" [initials]="team.abbreviation" [size]="104" />
              <div>
                <p class="text-sm font-medium uppercase tracking-wider" [style.color]="getContrastColor(team.primaryColor)">
                  {{ team.conference }} {{ team.division }}
                </p>
                <h1 class="mt-1 text-3xl font-bold sm:text-5xl" [style.color]="getContrastColor(team.primaryColor)">
                  {{ team.city }} {{ team.name }}
                </h1>
                <p class="mt-2 text-base opacity-90 sm:text-lg" [style.color]="getContrastColor(team.primaryColor)">
                  Football squares for {{ team.name }} fans
                </p>
              </div>
            </div>
          </header>

          <!-- CTA -->
          <section class="rounded-2xl border border-qs-line bg-qs-panel p-6 sm:p-8">
            <h2 class="text-2xl font-bold text-qs-ink">Create a squares contest for any {{ team.name }} game</h2>
            <p class="mt-2 text-qs-ink">
              Set up a football squares game for the next {{ team.city }} {{ team.name }} game.
              Share the link with friends and watch the board fill up.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                (click)="createBoard()"
                class="inline-flex min-h-11 items-center justify-center rounded-md px-6 font-semibold"
                [style.background]="team.primaryColor"
                [style.color]="getContrastColor(team.primaryColor)"
              >
                Create a free board
              </button>
              <a routerLink="/how-to-play" class="qs-btn qs-btn-secondary">
                How to play
              </a>
            </div>
          </section>

          <!-- Upcoming Games -->
          @if (loading() || games().length > 0) {
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-qs-ink">Upcoming {{ team.name }} games</h2>
            <p class="mt-2 text-qs-muted">
              Pick any game to run a squares board. Share the link before kickoff.
            </p>

            @if (loading()) {
              <div class="mt-6 animate-pulse space-y-3">
                @for (i of [1,2,3]; track i) {
                  <div class="h-16 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                }
              </div>
            } @else if (games().length > 0) {
              <div class="mt-6 space-y-3">
                @for (game of games(); track game.id) {
                  <div class="flex items-center justify-between gap-4 rounded-xl border border-qs-line bg-qs-panel p-4">
                    <div>
                      <p class="font-semibold text-qs-ink">
                        {{ game.awayTeam }} @ {{ game.homeTeam }}
                      </p>
                      <p class="text-sm text-qs-muted">{{ formatDate(game.date) }}</p>
                    </div>
                    <div class="flex shrink-0 flex-wrap justify-end gap-2">
                      <button type="button" (click)="printSheet(game)" class="qs-btn qs-btn-secondary">
                        Print board
                      </button>
                      <button type="button" (click)="createForGame(game)" class="qs-btn qs-btn-primary">
                        Create board
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
          }

          <!-- Team-themed printable board -->
          <section class="mt-10" aria-labelledby="sheet-heading">
            <h2 id="sheet-heading" class="text-2xl font-bold text-qs-ink">{{ team.name }} squares board</h2>
            <p class="mt-2 text-qs-muted">
              Print it for the wall, or choose "Save as PDF" in the print window. Write names first, then draw the digits.
            </p>
            <div class="team-sheet mt-4 rounded-[10px] border border-qs-line bg-white p-4 text-slate-900 sm:p-6">
              <div class="flex items-center justify-between gap-3">
                <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" class="h-6">
                <span class="text-xs text-slate-600">{{ sheet().date }}</span>
              </div>
              <p class="mt-3 text-lg font-bold">{{ sheet().away.label }} at {{ sheet().home.label }}</p>
              <div class="mt-3 overflow-x-auto">
                <div class="sheet-grid grid min-w-[560px]" style="grid-template-columns: 84px 40px repeat(10, minmax(0, 1fr));">
                  <div class="flex h-[84px] items-center justify-center gap-4 rounded-t-md text-2xl font-bold uppercase tracking-wide"
                       style="grid-column: 1 / -1; padding-left: 124px;" [style.background]="sheet().home.bg" [style.color]="sheet().home.fg">
                    @if (sheet().home.abbr; as abbr) {
                      <app-team-helmet [color]="sheet().home.bg" [initials]="abbr" [size]="72" />
                    }
                    {{ sheet().home.label }}
                  </div>
                  <div class="flex flex-col items-center justify-center rounded-bl-md text-2xl font-bold uppercase tracking-wide"
                       style="grid-row: 2 / span 11;"
                       [style.background]="sheet().away.bg" [style.color]="sheet().away.fg">
                    <div class="flex items-center gap-4 whitespace-nowrap" style="transform: rotate(-90deg);">
                      @if (sheet().away.abbr; as abbr) {
                        <app-team-helmet [color]="sheet().away.bg" [initials]="abbr" [size]="72" />
                      }
                      {{ sheet().away.label }}
                    </div>
                  </div>
                  <div class="h-10 border border-slate-900 bg-slate-100"></div>
                  @for (c of digits; track c) {
                    <div class="h-10 border border-slate-900" [style.background]="sheet().home.tint" aria-hidden="true"></div>
                  }
                  @for (r of digits; track r) {
                    <div class="h-12 border border-slate-900" [style.background]="sheet().away.tint" aria-hidden="true"></div>
                    @for (c of digits; track c) {
                      <div class="h-12 border border-slate-900" aria-hidden="true"></div>
                    }
                  }
                </div>
              </div>
              <p class="mt-3 text-xs text-slate-600">
                Columns are the {{ sheet().home.label }} score's last digit, rows are the {{ sheet().away.label }}'s.
                Run this board live at quarterscore.com.
              </p>
            </div>
            <button type="button" (click)="printSheet()" class="qs-btn qs-btn-primary mt-4">
              Print this board
            </button>
          </section>

          <!-- How It Works -->
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-qs-ink">How {{ team.name }} squares work</h2>
            <div class="mt-4 space-y-4 text-qs-ink">
              <p>
                Football squares is a simple game that makes every {{ team.name }} game more exciting.
                You don't need to know football - just claim a square and watch the score.
              </p>
              <ol class="list-decimal space-y-2 pl-5">
                <li>The host creates a 10x10 board (100 squares total)</li>
                <li>Friends claim squares by typing their name</li>
                <li>Numbers 0-9 are randomly assigned to each row and column</li>
                <li>At the end of each quarter, the last digit of each team's score determines the winning square</li>
              </ol>
              <p>
                For example, if the {{ team.name }} are winning 17-14 at halftime, the square at row 7, column 4 wins Q2.
              </p>
            </div>
            <a routerLink="/how-to-play" class="mt-4 inline-flex items-center font-medium text-qs-accent underline underline-offset-2">
              Read the full rules
            </a>
          </section>

          <!-- Other Teams -->
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-qs-ink">Other {{ team.conference }} {{ team.division }} teams</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              @for (rival of divisionRivals; track rival.slug) {
                <a
                  [routerLink]="'/team/' + rival.slug"
                  class="flex items-center gap-3 rounded-xl border border-qs-line bg-qs-panel p-3 hover:bg-qs-panel-2"
                >
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold"
                    [style.background]="rival.primaryColor"
                    [style.color]="getContrastColor(rival.primaryColor)"
                  >
                    {{ rival.abbreviation }}
                  </span>
                  <span class="font-medium text-qs-ink">{{ rival.city }} {{ rival.name }}</span>
                </a>
              }
            </div>
          </section>

          <!-- All Teams Link -->
          <section class="mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-qs-on-accent">
            <a routerLink="/teams" class="qs-btn qs-btn-ink">
              View all NFL teams
            </a>
            <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">
              Create a squares board for any team. Free for everyone.
            </p>
          </section>
        </article>
      } @else {
        <div class="py-12 text-center">
          <h1 class="text-2xl font-bold text-qs-ink">Team not found</h1>
          <p class="mt-2 text-qs-muted">We couldn't find that team.</p>
          <a routerLink="/teams" class="mt-4 inline-flex items-center font-medium text-qs-accent underline underline-offset-2">
            View all teams
          </a>
        </div>
      }
    </app-content-shell>

    <app-auth-modal
      [isOpen]="showAuthModal()"
      mode="host"
      (authenticated)="onAuthenticated()"
      (closed)="showAuthModal.set(false)">
    </app-auth-modal>
  `
})
export class TeamPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoService);
  private espn = inject(EspnService);
  private authService = inject(AuthService);

  public team: NflTeam | undefined;
  public breadcrumbs: { name: string; path: string }[] = [];
  public divisionRivals: NflTeam[] = [];
  public games = signal<EspnGame[]>([]);
  public loading = signal(false);
  public showAuthModal = signal(false);
  public readonly digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  private printGame = signal<EspnGame | null>(null);

  /** Matchup shown on the themed sheet: the chosen game, else the next game, else this team vs a blank opponent. */
  public sheet = computed(() => {
    const game = this.printGame() ?? this.games()[0];
    const band = (name: string | undefined) => {
      const t = name ? findTeam(name) : undefined;
      if (!t) return { label: name || 'Opponent', bg: '#e2e8f0', fg: '#0f172a', abbr: '', tint: '#f1f5f9' };
      const tint = `color-mix(in srgb, ${t.primaryColor} 16%, white)`;
      return { label: t.name, bg: t.primaryColor, fg: this.getContrastColor(t.primaryColor), abbr: t.abbreviation, tint };
    };
    if (!game) return { home: band(this.team?.abbreviation), away: band(undefined), date: '' };
    return { home: band(game.homeTeam), away: band(game.awayTeam), date: this.formatDate(game.date) };
  });
  public isAuthenticated = this.authService.isAuthenticated;
  private pendingCreateRedirect = false;

  constructor() {
    // Watch for auth state change after showing modal
    effect(() => {
      if (this.isAuthenticated() && this.pendingCreateRedirect) {
        this.pendingCreateRedirect = false;
        window.location.href = '/dashboard';
      }
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.router.navigate(['/teams']);
      return;
    }

    this.team = getTeamBySlug(slug);
    if (!this.team) {
      return;
    }

    this.breadcrumbs = [
      { name: 'Home', path: '/' },
      { name: 'Teams', path: '/teams' },
      { name: `${this.team.city} ${this.team.name}`, path: `/team/${slug}` }
    ];

    this.divisionRivals = NFL_TEAMS.filter(
      t => t.conference === this.team!.conference &&
           t.division === this.team!.division &&
           t.slug !== this.team!.slug
    );

    this.seo.apply({
      title: `${this.team.city} ${this.team.name} Football Squares - Free Game Board`,
      description: `Create a free ${this.team.name} football squares board for game day. Share one link, claim squares, and see who wins each quarter.`,
      path: `/team/${slug}`,
      headline: `${this.team.city} ${this.team.name} Football Squares`,
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });

    this.games.set((SCHEDULE.teams[slug] ?? []).map(toEspnGame));
    this.loading.set(this.games().length === 0);
    this.loadGames();
  }

  private async loadGames(): Promise<void> {
    if (!this.team) return;

    try {
      const teamGames = await this.espn.getTeamSchedule(this.team.espnId, 'nfl');
      if (teamGames.length > 0) this.games.set(teamGames);
    } catch {
      // keep the build-time schedule
    } finally {
      this.loading.set(false);
    }
  }

  public getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  public formatDate(dateStr: string): string {
    return formatKickoff(dateStr);
  }

  public printSheet(game?: EspnGame): void {
    if (game) this.printGame.set(game);
    const root = document.documentElement;
    root.classList.add('print-team-sheet');
    window.addEventListener('afterprint', () => root.classList.remove('print-team-sheet'), { once: true });
    setTimeout(() => window.print(), 50);
  }

  /** Create a board with this game already picked on the dashboard. */
  public createForGame(game: EspnGame): void {
    const home = findTeam(game.homeTeam);
    const away = findTeam(game.awayTeam);
    sessionStorage.setItem('qs_create_game', JSON.stringify({
      ...game,
      homeTeam: home?.abbreviation ?? game.homeTeam,
      awayTeam: away?.abbreviation ?? game.awayTeam
    }));
    this.createBoard();
  }

  public createBoard(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { queryParams: { create: 'true' } });
    } else {
      // Store intent before auth so it persists through popup flow
      sessionStorage.setItem('qs_create_after_auth', 'true');
      this.pendingCreateRedirect = true;
      this.showAuthModal.set(true);
    }
  }

  public onAuthenticated(): void {
    this.showAuthModal.set(false);
    // Effect will handle navigation when auth state changes
  }
}

/** ESPN schedules use full names ("Kansas City Chiefs"); the scoreboard uses abbreviations. */
function findTeam(name: string): NflTeam | undefined {
  return NFL_TEAMS.find(t => `${t.city} ${t.name}` === name || t.abbreviation === name);
}

function toEspnGame(game: ScheduledGame): EspnGame {
  return {
    id: game.id,
    name: `${game.awayTeamFull} at ${game.homeTeamFull}`,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeTeamFull: game.homeTeamFull,
    awayTeamFull: game.awayTeamFull,
    homeScore: 0,
    awayScore: 0,
    period: 0,
    clock: '',
    status: 'pre',
    completed: false,
    quarters: Array(4).fill({ home: 0, away: 0 }),
    date: game.date
  };
}
