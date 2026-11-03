import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';

@Component({
    selector: 'app-printable-board',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
      .board-grid {
        display: grid;
        grid-template-columns: 2rem repeat(10, 1fr);
        gap: 1px;
      }
      @media (min-width: 640px) {
        .board-grid {
          grid-template-columns: 3rem repeat(10, 1fr);
        }
      }
      .board-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.625rem;
        font-weight: 500;
      }
      @media (min-width: 640px) {
        .board-cell {
          font-size: 0.75rem;
        }
      }
      .axis-cell {
        background: var(--qs-tile);
        color: var(--qs-tile-ink);
        aspect-ratio: auto;
        height: 1.5rem;
      }
      @media (min-width: 640px) {
        .axis-cell {
          height: 2.25rem;
        }
      }
      .corner-cell {
        background: var(--qs-panel-2);
        aspect-ratio: auto;
        height: 1.5rem;
        font-size: 0.5rem;
        flex-direction: column;
        line-height: 1.2;
      }
      @media (min-width: 640px) {
        .corner-cell {
          height: 2.25rem;
          font-size: 0.625rem;
        }
      }
      .side-axis {
        aspect-ratio: 1;
        height: auto;
      }
    `,
    template: `
    <app-content-shell [wide]="true">
      <div class="no-print">
        <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      </div>
      <article>
        <header class="no-print max-w-3xl">
          <p class="qs-eyebrow">
            Free grid
          </p>
          <h1 class="qs-title mt-3 text-3xl sm:text-5xl">
            Printable football squares
          </h1>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            A blank 10 by 10 grid with no logos. Print it for the wall, or download the PDF.
            Write names first. Write the digits only after the draw.
          </p>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-md bg-qs-accent px-4 font-semibold text-white hover:bg-qs-accent-hover"
              (click)="printBoard()"
            >
              Print this board
            </button>
            <a
              href="assets/printable-football-squares.pdf"
              download="printable-football-squares.pdf"
              class="inline-flex min-h-11 items-center justify-center rounded-md border border-default bg-card px-4 font-semibold text-heading hover:bg-card-hover"
            >
              Download PDF
            </a>
          </div>
        </header>

        <section class="no-print mt-10 max-w-3xl" aria-labelledby="paper-heading">
          <h2 id="paper-heading" class="text-2xl font-bold text-heading">How to fill a paper board</h2>
          <ol class="mt-4 list-decimal space-y-3 pl-5 leading-relaxed text-default">
            <li>Write the home team over the columns and the away team beside the rows. Plain names are enough.</li>
            <li>Pass the sheet around. Each person writes their name in empty squares until you stop.</li>
            <li>Put the digits 0 through 9 in a hat, twice. Draw one set for the columns and one set for the rows. Write them in the blank header boxes in the order you draw them.</li>
            <li>At the end of each quarter, take the last digit of each score and find that row and column.</li>
          </ol>
          <p class="mt-4 leading-relaxed text-default">
            Paper gets lost, the math gets argued, and a friend in another city cannot see it.
            The online board keeps the names, the draw, and the quarter winners in one link.
            Many parties do both: the live board on the TV, and this sheet on the wall.
          </p>
        </section>

        <section class="print-sheet mt-10" aria-labelledby="grid-heading">
          <h2 id="grid-heading" class="text-2xl font-bold text-heading no-print">Blank board</h2>

          <!-- Print header with branding -->
          <div class="hidden print:flex items-center justify-between mb-4">
            <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" class="h-6">
            <span class="text-xs text-slate-500">quarterscore.com</span>
          </div>

          <p class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span class="flex items-center gap-1 font-semibold text-qs-ink">
              <span class="text-base leading-none text-qs-muted" aria-hidden="true">&#8595;</span>
              Away team: ____________
            </span>
            <span class="text-qs-line-strong" aria-hidden="true">/</span>
            <span class="flex items-center gap-1 font-semibold text-qs-ink">
              Home team: ____________
              <span class="text-base leading-none text-qs-muted" aria-hidden="true">&#8594;</span>
            </span>
          </p>

          <!-- Responsive CSS Grid board (full width) -->
          <div
            role="grid"
            aria-label="Blank football squares grid"
            class="board-grid w-full overflow-hidden rounded-md bg-qs-line p-px"
          >
            <!-- Top row: corner + 10 header cells -->
            <div class="board-cell corner-cell text-qs-muted">
              <span>AWAY &#8595;</span>
              <span>HOME &#8594;</span>
            </div>
            @for (col of columns; track col) {
              <div class="board-cell axis-cell" role="columnheader">
                <span class="sr-only">Home digit box {{ col }}</span>
              </div>
            }

            <!-- 10 rows: side header + 10 squares -->
            @for (row of columns; track row) {
              <div class="board-cell axis-cell side-axis" role="rowheader">
                <span class="sr-only">Away digit box {{ row }}</span>
              </div>
              @for (col of columns; track col) {
                <div class="board-cell bg-white" role="gridcell"></div>
              }
            }
          </div>

          <p class="mt-4 max-w-3xl text-sm leading-relaxed text-default">
            <strong>How to read:</strong> Columns are the home team's last digit. Rows are the away team's last digit.
            Find the square where the row and column meet to see the winner.
          </p>
          <p class="mt-2 text-xs text-muted">
            QuarterScore never collects, holds, or pays out money. quarterscore.com
          </p>
        </section>

        <section class="no-print mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" class="text-2xl font-bold text-heading">Keep going</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <a routerLink="/how-to-play" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">How to play</span>
                <span class="mt-1 block text-sm text-muted">The same rules, on a live board.</span>
              </a>
            </li>
            <li>
              <a routerLink="/" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">Homepage</span>
                <span class="mt-1 block text-sm text-muted">See a sample board and start a game.</span>
              </a>
            </li>
            <li>
              <a routerLink="/super-bowl-squares" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">Super Bowl squares</span>
                <span class="mt-1 block text-sm text-muted">The February 14, 2027 party board.</span>
              </a>
            </li>
            <li>
              <a routerLink="/blog" class="block rounded-xl border border-default bg-card p-4 hover:bg-card-hover">
                <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent">Blog</span>
                <span class="mt-1 block text-sm text-muted">Paper versus a live board, when that post is ready.</span>
              </a>
            </li>
          </ul>
        </section>

        <section class="no-print mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-white">
          <a routerLink="/dashboard" class="inline-flex min-h-11 items-center rounded-md bg-white px-4 font-semibold text-qs-accent hover:bg-qs-accent-soft">
            Skip the paper and run it live
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">
            Or keep both. The printable is free, and so is the online board.
          </p>
        </section>
      </article>
    </app-content-shell>
  `
})
export class PrintableBoardComponent {
  private seo = inject(SeoService);

  public readonly columns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Printable football squares', path: '/printable-football-squares' }
  ];

  constructor() {
    this.seo.apply({
      title: 'Printable Football Squares - Free 10 by 10 Grid - QuarterScore',
      description: 'Printable football squares: a free blank 10 by 10 grid, a print view, and a PDF download. No logos. Draw the numbers after every name is written.',
      path: '/printable-football-squares',
      headline: 'Printable football squares',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }

  public printBoard(): void {
    window.print();
  }
}
