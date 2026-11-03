import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';

@Component({
    selector: 'app-printable-board',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-content-shell [wide]="true">
      <div class="no-print">
        <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      </div>
      <article>
        <header class="max-w-3xl">
          <p class="qs-eyebrow">
            Free grid
          </p>
          <h1 class="qs-title mt-3 text-3xl sm:text-5xl">
            Printable football squares
          </h1>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            A blank 10×10 grid ready for your game. Download the PDF, print it, and fill in names and numbers by hand.
          </p>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="assets/printable-football-squares.pdf"
              download="printable-football-squares.pdf"
              class="qs-btn qs-btn-primary"
            >
              Download PDF
            </a>
            <a routerLink="/dashboard" class="qs-btn qs-btn-secondary">
              Or start a free online board
            </a>
          </div>
        </header>

        <!-- Preview grid -->
        <section class="mt-10" aria-labelledby="preview-heading">
          <h2 id="preview-heading" class="text-xl font-semibold text-heading">What's in the PDF</h2>
          <p class="mt-2 text-muted">A clean 10×10 grid with space for team names and drawn numbers.</p>

          <div class="mt-6 qs-canvas inline-block rounded-card p-3 sm:p-4">
            <p class="mb-2 flex items-center gap-2 text-sm">
              <span class="font-semibold text-qs-ink">
                <span class="text-qs-muted">↓</span> Away
              </span>
              <span class="text-qs-line-strong">/</span>
              <span class="font-semibold text-qs-ink">
                Home <span class="text-qs-muted">→</span>
              </span>
            </p>
            <div class="grid grid-cols-[1.5rem_repeat(10,minmax(0,1fr))] gap-px overflow-hidden rounded-inner bg-qs-line p-px sm:grid-cols-[2rem_repeat(10,minmax(0,1fr))]">
              <!-- Header row -->
              <div class="flex h-6 items-center justify-center bg-qs-panel-2 sm:h-8"></div>
              @for (i of digits; track i) {
                <div class="flex h-6 items-center justify-center bg-qs-tile text-[10px] font-medium text-qs-tile-muted sm:h-8 sm:text-xs"></div>
              }
              <!-- Grid rows -->
              @for (row of digits; track row) {
                <div class="flex h-6 items-center justify-center bg-qs-tile text-[10px] font-medium text-qs-tile-muted sm:h-8 sm:text-xs"></div>
                @for (col of digits; track col) {
                  <div class="flex aspect-square items-center justify-center bg-qs-panel"></div>
                }
              }
            </div>
          </div>
        </section>

        <section class="mt-10 max-w-3xl" aria-labelledby="paper-heading">
          <h2 id="paper-heading" class="text-2xl font-bold text-heading">How to fill a paper board</h2>
          <ol class="mt-4 list-decimal space-y-3 pl-5 leading-relaxed text-default">
            <li>Write the home team over the columns and the away team beside the rows.</li>
            <li>Pass the sheet around. Each person writes their name in empty squares.</li>
            <li>Put the digits 0–9 in a hat, twice. Draw one set for columns and one for rows. Write them in the header boxes in draw order.</li>
            <li>At each quarter's end, take the last digit of each score to find the winning square.</li>
          </ol>
        </section>

        <section class="mt-10 max-w-3xl rounded-2xl border border-qs-line bg-qs-panel-2 p-6">
          <h2 class="text-xl font-semibold text-heading">Why go digital?</h2>
          <ul class="mt-4 space-y-2 text-default">
            <li>• <strong>No math:</strong> The board calculates winners automatically</li>
            <li>• <strong>Share a link:</strong> Friends anywhere can claim squares</li>
            <li>• <strong>Live scores:</strong> Connect to ESPN for real-time updates</li>
            <li>• <strong>Still free:</strong> Same as the paper version</li>
          </ul>
          <a routerLink="/dashboard" class="mt-6 inline-flex min-h-11 items-center rounded-md bg-qs-accent px-4 font-semibold text-white hover:bg-qs-accent-hover">
            Start a free online board
          </a>
        </section>

        <section class="mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" class="text-2xl font-bold text-heading">Keep going</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <a routerLink="/how-to-play" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">How to play</span>
                <span class="mt-1 block text-sm text-muted">Full rules for football squares.</span>
              </a>
            </li>
            <li>
              <a routerLink="/best-squares-numbers" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">Best numbers</span>
                <span class="mt-1 block text-sm text-muted">Which squares win most often.</span>
              </a>
            </li>
            <li>
              <a routerLink="/super-bowl-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">Super Bowl squares</span>
                <span class="mt-1 block text-sm text-muted">The big game board.</span>
              </a>
            </li>
            <li>
              <a routerLink="/" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2">Homepage</span>
                <span class="mt-1 block text-sm text-muted">See a live demo board.</span>
              </a>
            </li>
          </ul>
        </section>
      </article>
    </app-content-shell>
  `
})
export class PrintableBoardComponent {
  private seo = inject(SeoService);

  public readonly digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Printable football squares', path: '/printable-football-squares' }
  ];

  constructor() {
    this.seo.apply({
      title: 'Printable Football Squares — Free PDF Download — QuarterScore',
      description: 'Download a free printable football squares PDF. A blank 10×10 grid for Super Bowl parties and game day. Print it, fill in names, draw numbers.',
      path: '/printable-football-squares',
      headline: 'Printable football squares',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }
}
