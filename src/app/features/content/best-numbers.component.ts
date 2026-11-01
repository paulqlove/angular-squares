import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { SQUARES_PROBABILITIES } from '../super-bowl-squares/utils/probability.utils';
import { ContentShellComponent } from './content-shell.component';

@Component({
    selector: 'app-best-numbers',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-content-shell [wide]="true">
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      <article>
        <header class="max-w-3xl">
          <p class="qs-eyebrow">
            Historical frequencies
          </p>
          <h1 class="qs-title mt-3 text-3xl sm:text-5xl">
            Best squares numbers
          </h1>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            Some last digits show up more often than others in professional football scores.
            This is the same table Quarter Score uses on a board’s heatmap. It describes the past.
            It does not predict your game, and it is not a reason to sweat your draw.
          </p>
        </header>

        <section class="mt-10 max-w-3xl" aria-labelledby="why-heading">
          <h2 id="why-heading" class="text-2xl font-bold text-heading">Why 0, 7, 3, and 4 lead</h2>
          <p class="mt-3 leading-relaxed text-default">
            Football scoring clumps. A touchdown with an extra point is 7. A field goal is 3.
            Games and quarters also end on 0 more often than on 2 or 5. In this table, the away
            last digit is 0 about {{ awayShare(0) }} of the time and 7 about {{ awayShare(7) }} of
            the time. Digits 3 and 4 are next. Digits 2 and 5 are the least common, near
            {{ awayShare(2) }} and {{ awayShare(5) }}.
          </p>
          <p class="mt-3 leading-relaxed text-default">
            The home column tells the same story. The single fullest cell is away 7 with home 0,
            at 3.5 percent. A cell marked 0.0, such as 2 and 2, did not appear in the published
            rounding of this table. That is not the same as “impossible.” A less common square
            still comes up, and the draw is random on purpose.
          </p>
        </section>

        <section class="mt-10" aria-labelledby="table-heading">
          <h2 id="table-heading" class="text-2xl font-bold text-heading">Every digit pair</h2>
          <p class="mt-3 max-w-3xl leading-relaxed text-default">
            Rows are the away team’s last digit. Columns are the home team’s last digit.
            Each cell is that pair’s share of historical final scores. Numbers are rounded,
            so the grid totals 99.9 rather than 100.
          </p>
          <p class="mt-2 text-sm text-muted md:hidden">Scroll sideways to read every digit.</p>
          <div class="mt-4 overflow-x-auto" tabindex="0" aria-label="Historical digit table. Scroll sideways if needed.">
            <table class="w-full min-w-[44rem] border-collapse text-center font-mono text-sm">
              <caption class="sr-only">
                Historical frequency of each away last digit and home last digit pair, in percent.
              </caption>
              <thead>
                <tr>
                  <th scope="col" class="bg-qs-panel-2 p-2 text-left qs-label text-qs-muted">Away \\ Home</th>
                  @for (digit of digits; track digit) {
                    <th scope="col" class="bg-qs-tile p-2 text-xs font-medium text-qs-tile-ink">{{ digit }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (away of digits; track away) {
                  <tr>
                    <th scope="row" class="bg-qs-tile p-2 text-xs font-medium text-qs-tile-ink">{{ away }}</th>
                    @for (home of digits; track home) {
                      <td [class]="cellClass(share(away, home))" class="border border-qs-line p-2 font-medium">
                        {{ share(away, home).toFixed(1) }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ul class="mt-4 flex flex-wrap gap-3 text-sm text-default" aria-label="Color key">
            <li class="qs-heat-5 rounded-chip px-2 py-1 font-mono">3.0 or more</li>
            <li class="qs-heat-4 rounded-chip px-2 py-1 font-mono">2.0 to 2.9</li>
            <li class="qs-heat-3 rounded-chip px-2 py-1 font-mono">1.5 to 1.9</li>
            <li class="qs-heat-2 rounded-chip px-2 py-1 font-mono">1.0 to 1.4</li>
            <li class="qs-heat-1 rounded-chip px-2 py-1 font-mono">0.5 to 0.9</li>
            <li class="qs-heat-0 rounded-chip border border-qs-line px-2 py-1 font-mono">Under 0.5</li>
          </ul>
          <p class="mt-4 text-xs text-muted">
            Source:
            <a
              href="https://www.eldo.co/super-bowl-squares-odds-probabilities-best-worst-numbers.html"
              class="text-qs-accent underline underline-offset-2 text-qs-accent"
              rel="noopener noreferrer"
              target="_blank"
            >
              ELDORADO, Super Bowl squares frequencies
            </a>.
            Quarter Score does not republish that site’s charts. This grid is the table already
            shipped in the app.
          </p>
        </section>

        <section class="mt-10 max-w-3xl" aria-labelledby="quarters-heading">
          <h2 id="quarters-heading" class="text-2xl font-bold text-heading">Quarters are not a second table</h2>
          <p class="mt-3 leading-relaxed text-default">
            This page is one grid, not four. Early quarters often sit on smaller scores, so 0 is
            a familiar first-quarter digit, and the final score is where 7s stack up. We do not
            publish a separate percentage for each quarter, because this source does not either.
            On a live board the heatmap colors the same pairs after your digits are drawn.
          </p>
        </section>

        <section class="mt-10 max-w-3xl" aria-labelledby="luck-heading">
          <h2 id="luck-heading" class="text-2xl font-bold text-heading">Have fun with it</h2>
          <p class="mt-3 leading-relaxed text-default">
            Numbers are drawn after the names are on the board, so a “good” digit is luck.
            A square that is rare in the table still comes up. Bring the board for the company.
          </p>
        </section>

        <section class="mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" class="text-2xl font-bold text-heading">Keep going</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <a routerLink="/how-to-play" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">How to play</span>
                <span class="mt-1 block text-sm text-muted">How the draw and the quarter winner work.</span>
              </a>
            </li>
            <li>
              <a routerLink="/super-bowl-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">Super Bowl squares</span>
                <span class="mt-1 block text-sm text-muted">The February 14, 2027 board.</span>
              </a>
            </li>
            <li>
              <a routerLink="/" fragment="probability-heatmap" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">Homepage heatmap</span>
                <span class="mt-1 block text-sm text-muted">Where the in-game chart is introduced.</span>
              </a>
            </li>
          </ul>
        </section>

        <section class="mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-white">
          <a routerLink="/dashboard" class="inline-flex min-h-11 items-center rounded-md bg-white px-4 font-semibold text-qs-accent hover:bg-qs-accent-soft">
            Start a free game
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">
            See the same colors on your own board after the numbers are drawn.
            Quarter Score never collects, holds, or pays out money.
          </p>
        </section>
      </article>
    </app-content-shell>
  `
})
export class BestNumbersComponent {
  private seo = inject(SeoService);

  public readonly digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Best squares numbers', path: '/best-squares-numbers' }
  ];

  private readonly awayTotals: number[];

  constructor() {
    const away = Array(10).fill(0);
    for (const digit of this.digits) {
      for (const other of this.digits) {
        away[digit] += this.share(digit, other);
      }
    }
    this.awayTotals = away;

    this.seo.apply({
      title: 'Best Squares Numbers from Scoring History — Quarter Score',
      description: 'Best Super Bowl squares numbers, from the same historical digit table as the Quarter Score heatmap. See how often each last-digit pair has shown up.',
      path: '/best-squares-numbers',
      headline: 'Best squares numbers',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }

  public share(away: number, home: number): number {
    return SQUARES_PROBABILITIES[`${away},${home}`] ?? 0;
  }

  public awayShare(digit: number): string {
    return `${this.awayTotals[digit].toFixed(1)} percent`;
  }

  public cellClass(share: number): string {
    if (share >= 3) return 'qs-heat-5';
    if (share >= 2) return 'qs-heat-4';
    if (share >= 1.5) return 'qs-heat-3';
    if (share >= 1) return 'qs-heat-2';
    if (share >= 0.5) return 'qs-heat-1';
    return 'qs-heat-0';
  }

  }
