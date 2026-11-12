import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { NFL_TEAMS, NflTeam } from './teams-data';

interface Division {
  name: string;
  teams: NflTeam[];
}

interface Conference {
  name: 'AFC' | 'NFC';
  divisions: Division[];
}

@Component({
  selector: 'app-teams-index',
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      <article>
        <header>
          <p class="qs-eyebrow">NFL Teams</p>
          <h1 class="qs-title mt-3 text-4xl sm:text-5xl">Football squares by team</h1>
          <p class="mt-5 max-w-[60ch] text-xl leading-snug text-qs-muted">
            Create a squares board for any NFL team. Pick your team, share the link, and play.
          </p>
        </header>

        @for (conf of conferences; track conf.name) {
          <section class="mt-12 sm:mt-16">
            <h2 class="text-2xl font-semibold leading-tight tracking-tight text-qs-ink sm:text-[1.75rem]">{{ conf.name }}</h2>
            <div class="mt-4 grid gap-6 sm:grid-cols-2">
              @for (div of conf.divisions; track div.name) {
                <div>
                  <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-qs-muted">
                    {{ conf.name }} {{ div.name }}
                  </h3>
                  <div class="space-y-2">
                    @for (team of div.teams; track team.slug) {
                      <a
                        [routerLink]="'/team/' + team.slug"
                        class="flex items-center gap-3 rounded-xl border border-qs-line bg-qs-panel p-3 transition-colors hover:bg-qs-panel-2"
                      >
                        <span
                          class="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold"
                          [style.background]="badge(team.primaryColor).background"
                          [style.color]="badge(team.primaryColor).ink"
                        >
                          {{ team.abbreviation }}
                        </span>
                        <div>
                          <p class="font-semibold text-qs-ink">{{ team.city }} {{ team.name }}</p>
                          <p class="text-sm text-qs-muted">Create a {{ team.name }} board</p>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- CTA -->
        <section class="mt-12 sm:mt-16 rounded-2xl bg-qs-accent px-5 py-6 text-qs-on-accent">
          <a routerLink="/create" class="qs-btn qs-btn-ink">
            Create a board
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">
            Pick any team when you set up the game. Free for everyone.
          </p>
        </section>

        <!-- Related -->
        <section class="mt-12 sm:mt-16">
          <h2 class="text-2xl font-semibold leading-tight tracking-tight text-qs-ink sm:text-[1.75rem]">More ways to play</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <a routerLink="/how-to-play" class="block rounded-xl border border-qs-line bg-qs-panel p-4 hover:bg-qs-panel-2">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">How to play</span>
                <span class="mt-1 block text-sm text-qs-muted">The full rules for football squares.</span>
              </a>
            </li>
            <li>
              <a routerLink="/super-bowl-squares" class="block rounded-xl border border-qs-line bg-qs-panel p-4 hover:bg-qs-panel-2">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">Super Bowl squares</span>
                <span class="mt-1 block text-sm text-qs-muted">The big game board for February.</span>
              </a>
            </li>
            <li>
              <a routerLink="/nfl-playoff-squares" class="block rounded-xl border border-qs-line bg-qs-panel p-4 hover:bg-qs-panel-2">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">NFL playoff squares</span>
                <span class="mt-1 block text-sm text-qs-muted">Wild card through the championship.</span>
              </a>
            </li>
            <li>
              <a routerLink="/college-football-squares" class="block rounded-xl border border-qs-line bg-qs-panel p-4 hover:bg-qs-panel-2">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">College football squares</span>
                <span class="mt-1 block text-sm text-qs-muted">Bowl games and the playoff.</span>
              </a>
            </li>
          </ul>
        </section>
      </article>
    </app-content-shell>
  `
})
export class TeamsIndexComponent {
  private seo = inject(SeoService);

  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'NFL Teams', path: '/teams' }
  ];

  public readonly conferences: Conference[] = [
    {
      name: 'AFC',
      divisions: ['East', 'North', 'South', 'West'].map(div => ({
        name: div,
        teams: NFL_TEAMS.filter(t => t.conference === 'AFC' && t.division === div)
      })) as Division[]
    },
    {
      name: 'NFC',
      divisions: ['East', 'North', 'South', 'West'].map(div => ({
        name: div,
        teams: NFL_TEAMS.filter(t => t.conference === 'NFC' && t.division === div)
      })) as Division[]
    }
  ];

  constructor() {
    this.seo.apply({
      title: 'NFL Football Squares by Team - Free Game Boards',
      description: 'Create a free football squares board for any NFL team. Pick your team, share the link, and play squares for game day.',
      path: '/teams',
      headline: 'Football Squares by Team',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }

  /** The badge's colors: the team color with white or near-black letters, whichever reads better. A few mid blues and
   * teals miss 4.5:1 with both, so those get the team color a shade darker, just enough for white letters to read. */
  public badge(hex: string): { background: string; ink: string } {
    const rgb = [0, 2, 4].map(i => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
    const lum = (c: number[]) => {
      const [r, g, b] = c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const onWhite = (c: number[]) => 1.05 / (lum(c) + 0.05);
    const onInk = (lum(rgb) + 0.05) / 0.0636;
    if (onInk >= 4.5 && onInk > onWhite(rgb)) return { background: hex, ink: '#0f172a' };
    let shade = rgb;
    for (let k = 0.95; onWhite(shade) < 4.5 && k > 0.5; k -= 0.05) shade = rgb.map(v => Math.round(v * k));
    return { background: `#${shade.map(v => v.toString(16).padStart(2, '0')).join('')}`, ink: '#ffffff' };
  }
}
