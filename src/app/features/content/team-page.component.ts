import { Component, inject, ChangeDetectionStrategy, OnInit, signal, effect, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/services/auth.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPrinter } from '@ng-icons/heroicons/outline';
import { NflTeam, getTeamBySlug, NFL_TEAMS, teamBadge } from './teams-data';
import { ReadingEndComponent, ReadingSectionComponent } from './reading-layout.components';
import { PageCta, RelatedLink } from './marketing-pages';
import { TeamHelmetComponent } from '../../shared/team-helmet.component';
import { EspnService, EspnGame } from '../../core/services/espn.service';
import { SCHEDULE } from './schedule.generated';
import { ScheduledGame, formatKickoff } from './schedule.model';

@Component({
  selector: 'app-team-page',
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent, AuthModalComponent, TeamHelmetComponent, NgIconComponent, ReadingSectionComponent, ReadingEndComponent],
  providers: [provideIcons({ heroPrinter })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-content-shell>
      <div class="mx-auto max-w-[64rem]">
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>

      @if (team; as team) {
        <article>
          <!-- One plain header. The team color shows only in the badge and on the printable board. -->
          <header class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-16">
            <div>
              <p class="flex items-center gap-3">
                <span class="flex h-7 min-w-7 items-center justify-center rounded-md px-1 font-mono text-[0.625rem] font-bold"
                      [style.background]="badge(team.primaryColor).background" [style.color]="badge(team.primaryColor).ink">{{ team.abbreviation }}</span>
                <span class="qs-eyebrow">{{ team.conference }} {{ team.division }}</span>
              </p>
              <h1 class="qs-title mt-5 text-balance text-[clamp(2.5rem,5.6vw,4.25rem)] leading-[1.02] tracking-[-0.04em]">{{ team.city }} {{ team.name }} squares</h1>
              <p class="mt-6 max-w-[34rem] text-xl leading-[1.5] text-qs-muted">
                Run a free squares board for any {{ team.name }} game. Share the link and watch it fill up.
              </p>
              <div class="mt-8 flex flex-wrap gap-3">
                <button type="button" (click)="createBoard()" class="qs-btn qs-btn-primary">Create a board</button>
                <a routerLink="/how-to-play" class="qs-btn qs-btn-secondary">How to play</a>
              </div>
            </div>

            @if (games().length > 0) {
              <section class="rounded-card border border-qs-line bg-qs-panel shadow-pop lg:mt-2" aria-labelledby="games-heading">
                <div class="flex items-baseline justify-between px-5 pb-1 pt-4">
                  <h2 id="games-heading" class="qs-label text-qs-muted">Upcoming games</h2>
                  <span class="qs-label text-qs-muted">{{ games().length }}</span>
                </div>
                <ul>
                  @for (game of games(); track game.id) {
                    <li class="flex items-center gap-3 border-b border-qs-line px-5 py-3">
                      <div class="min-w-0 flex-1">
                        <p class="font-mono text-sm font-semibold tracking-wide text-qs-ink">{{ abbr(game.awayTeam) }} &#64; {{ abbr(game.homeTeam) }}</p>
                        <p class="mt-0.5 text-sm text-qs-muted">{{ formatDate(game.date) }}</p>
                      </div>
                      <button type="button" (click)="printSheet(game)" class="qs-btn qs-btn-ghost w-11 shrink-0 px-0 text-qs-muted hover:text-qs-ink"
                              [attr.aria-label]="'Print the ' + abbr(game.awayTeam) + ' at ' + abbr(game.homeTeam) + ' board'">
                        <ng-icon name="heroPrinter" class="text-lg" aria-hidden="true"></ng-icon>
                      </button>
                      <button type="button" (click)="createForGame(game)" class="qs-btn qs-btn-secondary shrink-0"
                              [attr.aria-label]="'Create a board for ' + abbr(game.awayTeam) + ' at ' + abbr(game.homeTeam)">Create</button>
                    </li>
                  }
                </ul>
                  <p class="px-5 py-3 text-sm text-qs-muted">Share the link before kickoff.</p>
              </section>
            }
          </header>

          <!-- Team-themed printable board -->
          <app-reading-section [heading]="team.name + ' squares board'" headingId="sheet-heading">
            <p>Print it for the wall, or save it as a PDF. Write names first, then draw the digits.</p>
            <div wide class="lg:col-span-2">
              <div class="team-sheet-stage qs-canvas rounded-card border border-qs-line p-3 sm:p-10">
                <div class="team-sheet mx-auto max-w-[44rem] rounded-card border border-qs-line bg-white p-4 text-slate-900 shadow-pop sm:p-6">
                  <div class="flex items-center justify-between gap-3">
                    <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" width="192" height="24" class="h-6 w-auto">
                    <span class="font-mono text-xs text-slate-600">{{ sheet().date }}</span>
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
              </div>
              <button type="button" (click)="printSheet()" class="qs-btn qs-btn-secondary mt-6">
                <ng-icon name="heroPrinter" class="text-base" aria-hidden="true"></ng-icon>
                Print this board
              </button>
            </div>
          </app-reading-section>

          <!-- The rules, as four steps -->
          <app-reading-section [heading]="'How ' + team.name + ' squares work'">
            <p>Claim a square and watch the score. You don't need to know football.</p>
            <ol wide class="grid gap-y-8 border-y border-qs-line py-6 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4 lg:gap-y-0">
              @for (step of steps(); track step.name; let index = $index) {
                <li class="lg:border-l lg:border-qs-line lg:px-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0">
                  <p class="qs-label text-qs-accent">0{{ index + 1 }}</p>
                  <h3 class="mt-3 text-lg font-semibold leading-snug text-qs-ink">{{ step.name }}</h3>
                  <p class="qs-body mt-2 text-[0.9375rem] leading-[1.65]">{{ step.text }}</p>
                </li>
              }
            </ol>
          </app-reading-section>

          <!-- Other teams in the division -->
          <app-reading-section [heading]="'Other ' + team.conference + ' ' + team.division + ' teams'">
            <ul class="!mt-0 grid gap-3 sm:grid-cols-3">
              @for (rival of divisionRivals; track rival.slug) {
                <li>
                  <a [routerLink]="'/team/' + rival.slug"
                     class="flex min-h-11 items-center gap-3 rounded-card border border-qs-line bg-qs-panel p-3 transition-colors hover:bg-qs-panel-2">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold"
                          [style.background]="badge(rival.primaryColor).background" [style.color]="badge(rival.primaryColor).ink">{{ rival.abbreviation }}</span>
                    <span class="text-[0.9375rem] font-semibold leading-snug text-qs-ink">{{ rival.city }} {{ rival.name }}</span>
                  </a>
                </li>
              }
            </ul>
          </app-reading-section>

          <app-reading-end [related]="related" [cta]="cta"></app-reading-end>
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
      </div>
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

  public readonly badge = teamBadge;
  public team: NflTeam | undefined;
  public readonly cta: PageCta = {
    path: '/create',
    label: 'Create a board',
    note: 'Create a squares board for any team. Free for everyone.'
  };
  public readonly related: RelatedLink[] = [
    { path: '/teams', label: 'All NFL teams', text: 'Pick any team and run a board for its next game.' },
    { path: '/how-to-play', label: 'How to play', text: 'The full rules for football squares.' },
    { path: '/best-squares-numbers', label: 'Best numbers', text: 'Which squares hit most often in past games.' }
  ];
  /** The four rules steps, with the team's name in the example. */
  public readonly steps = computed(() => {
    const name = this.team?.name ?? 'Home team';
    return [
      { name: 'Make the board', text: 'The host sets up a 10 by 10 board for the game.' },
      { name: 'Claim squares', text: 'Friends tap a square and type their name. No account needed.' },
      { name: 'Draw the numbers', text: 'Each row and column gets a random digit from 0 to 9.' },
      { name: 'Win a quarter', text: `${name} up 17 to 14 at the half? Row 7, column 4 wins Q2.` }
    ];
  });
  public breadcrumbs: { name: string; path: string }[] = [];
  public divisionRivals: NflTeam[] = [];
  public games = signal<EspnGame[]>([]);
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

    // The build-time schedule draws the games card. With none, the card stays out rather than showing placeholders
    // that would vanish and shift the page.
    this.games.set((SCHEDULE.teams[slug] ?? []).map(toEspnGame));
    this.loadGames();
  }

  private async loadGames(): Promise<void> {
    if (!this.team) return;

    try {
      const teamGames = await this.espn.getTeamSchedule(this.team.espnId, 'nfl');
      if (teamGames.length > 0) this.games.set(teamGames);
    } catch {
      // keep the build-time schedule
    }
  }

  public getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  /** The team's short name, for "KC @ ATL". */
  public abbr(name: string): string {
    return findTeam(name)?.abbreviation ?? name;
  }

  /** "Sun, Nov 15 · 1:00 PM ET" */
  public formatDate(dateStr: string): string {
    return formatKickoff(dateStr).replace(/, (\d{1,2}:\d{2})/, ' · $1');
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
