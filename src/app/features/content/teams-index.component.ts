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
          <h1 class="qs-title mt-3 text-3xl sm:text-5xl">Football squares by team</h1>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            Create a squares board for any NFL team. Pick your team, share the link, and play.
          </p>
        </header>

        @for (conf of conferences; track conf.name) {
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-heading">{{ conf.name }}</h2>
            <div class="mt-4 grid gap-6 sm:grid-cols-2">
              @for (div of conf.divisions; track div.name) {
                <div>
                  <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                    {{ conf.name }} {{ div.name }}
                  </h3>
                  <div class="space-y-2">
                    @for (team of div.teams; track team.slug) {
                      <a
                        [routerLink]="'/team/' + team.slug"
                        class="flex items-center gap-3 rounded-xl border border-default bg-card p-3 transition-colors hover:bg-card-hover"
                      >
                        <span
                          class="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
                          [style.background]="team.primaryColor"
                        >
                          {{ team.abbreviation }}
                        </span>
                        <div>
                          <p class="font-semibold text-heading">{{ team.city }} {{ team.name }}</p>
                          <p class="text-sm text-muted">Create a {{ team.name }} board</p>
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
        <section class="mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-qs-on-accent">
          <a routerLink="/create" class="qs-btn qs-btn-ink">
            Create your board now
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">
            Pick any team when you set up the game. Free for everyone.
          </p>
        </section>

        <!-- Related -->
        <section class="mt-10">
          <h2 class="text-2xl font-bold text-heading">More ways to play</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <a routerLink="/how-to-play" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">How to play</span>
                <span class="mt-1 block text-sm text-muted">The full rules for football squares.</span>
              </a>
            </li>
            <li>
              <a routerLink="/super-bowl-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">Super Bowl squares</span>
                <span class="mt-1 block text-sm text-muted">The big game board for February.</span>
              </a>
            </li>
            <li>
              <a routerLink="/nfl-playoff-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">NFL playoff squares</span>
                <span class="mt-1 block text-sm text-muted">Wild card through the championship.</span>
              </a>
            </li>
            <li>
              <a routerLink="/college-football-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">College football squares</span>
                <span class="mt-1 block text-sm text-muted">Bowl games and the playoff.</span>
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
}
