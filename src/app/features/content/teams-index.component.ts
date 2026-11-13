import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { NFL_TEAMS, NflTeam, teamBadge } from './teams-data';
import { ReadingEndComponent, ReadingSectionComponent } from './reading-layout.components';
import { PageCta, RelatedLink } from './marketing-pages';

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
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent, ReadingSectionComponent, ReadingEndComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-content-shell>
      <div class="mx-auto max-w-[64rem]">
        <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
        <article>
          <header>
            <p class="qs-eyebrow">NFL Teams</p>
            <h1 class="qs-title mt-5 text-balance text-[clamp(2.5rem,5.6vw,4.25rem)] leading-[1.02] tracking-[-0.04em]">Football squares by team</h1>
            <p class="mt-6 max-w-[34rem] text-xl leading-[1.5] text-qs-muted">Pick your team, share the link, and play.</p>
          </header>

          @for (conf of conferences; track conf.name) {
            <app-reading-section [heading]="conf.name">
              <div wide class="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:!col-start-2 lg:row-start-1">
                @for (div of conf.divisions; track div.name) {
                  <div>
                    <h3 class="qs-label mb-3 text-qs-muted">{{ conf.name }} {{ div.name }}</h3>
                    <ul class="space-y-2">
                      @for (team of div.teams; track team.slug) {
                        <li>
                          <a [routerLink]="'/team/' + team.slug"
                             class="flex min-h-11 items-center gap-3 rounded-card border border-qs-line bg-qs-panel p-3 transition-colors hover:bg-qs-panel-2">
                            <span translate="no" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold"
                                  [style.background]="badge(team.primaryColor).background" [style.color]="badge(team.primaryColor).ink">{{ team.abbreviation }}</span>
                            <span class="min-w-0">
                              <span translate="no" class="block text-[0.9375rem] font-semibold leading-snug text-qs-ink">{{ team.city }} {{ team.name }}</span>
                              <span class="block text-sm text-qs-muted">Create a {{ team.name }} board</span>
                            </span>
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </app-reading-section>
          }

          <app-reading-end [related]="related" [cta]="cta"></app-reading-end>
        </article>
      </div>
    </app-content-shell>
  `
})
export class TeamsIndexComponent {
  private seo = inject(SeoService);

  public readonly badge = teamBadge;
  public readonly cta: PageCta = {
    path: '/create',
    label: 'Create a board',
    note: 'Pick any team when you set up the game. Free for everyone.'
  };
  public readonly related: RelatedLink[] = [
    { path: '/how-to-play', label: 'How to play', text: 'The full rules for football squares.' },
    { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'The big game board for February.' },
    { path: '/nfl-playoff-squares', label: 'NFL playoff squares', text: 'Wild card through the championship.' },
    { path: '/college-football-squares', label: 'College football squares', text: 'Bowl games and the playoff.' }
  ];

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
