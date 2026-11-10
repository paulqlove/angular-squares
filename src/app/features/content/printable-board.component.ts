import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { PageCta, RelatedLink } from './marketing-pages';
import { ReadingEndComponent, ReadingHeaderComponent, ReadingPageComponent, ReadingSectionComponent } from './reading-layout.components';

@Component({
    selector: 'app-printable-board',
    imports: [ReadingPageComponent, ReadingHeaderComponent, ReadingSectionComponent, ReadingEndComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
      .grid-row {
        display: grid;
        grid-template-columns: 2rem repeat(10, 1fr);
        gap: 1px;
      }
      @media (min-width: 640px) {
        .grid-row {
          grid-template-columns: 3rem repeat(10, 1fr);
        }
      }
      .cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.625rem;
        font-weight: 500;
        background: white;
      }
      @media (min-width: 640px) {
        .cell {
          font-size: 0.75rem;
        }
      }
      .axis-top {
        background: #f1f5f9;
        color: #94a3b8;
        aspect-ratio: auto;
        height: 1.5rem;
      }
      @media (min-width: 640px) {
        .axis-top {
          height: 2.25rem;
        }
      }
      .axis-side {
        background: #f1f5f9;
        color: #94a3b8;
      }
      .corner {
        background: #f1f5f9;
        color: #64748b;
        aspect-ratio: auto;
        height: 1.5rem;
        font-size: 0.5rem;
        flex-direction: column;
        line-height: 1.2;
      }
      @media (min-width: 640px) {
        .corner {
          height: 2.25rem;
          font-size: 0.625rem;
        }
      }
    `,
    template: `
    <app-reading-page [breadcrumbs]="breadcrumbs">
      <app-reading-header class="no-print" eyebrow="Free grid" title="Printable football squares"
        lede="A blank 10 by 10 grid with no logos. Print it for the wall, or download the PDF. Write names first. Write the digits only after the draw.">
        <div actions class="mt-8">
          <a href="assets/printable-football-squares.pdf" download="printable-football-squares.pdf" class="qs-btn qs-btn-primary">Download PDF</a>
        </div>
      </app-reading-header>

      <app-reading-section class="no-print" heading="How to fill a paper board" headingId="paper-heading">
        <ol class="list-decimal space-y-3 pl-5">
          <li>Write the home team over the columns and the away team beside the rows.</li>
          <li>Pass the sheet around. Each person writes their name in empty squares until you stop.</li>
          <li>Put the digits 0 through 9 in a hat, twice. Draw one set for the columns and one for the rows, and write them in the header boxes in order.</li>
          <li>Each quarter, take the last digit of each score and find that row and column.</li>
        </ol>
        <p>Many parties do both: the live board on the TV, and this sheet on the wall.</p>
      </app-reading-section>

      <section class="print-sheet mt-20 border-t border-qs-line pt-8 print:mt-0 print:border-0 print:pt-0" aria-labelledby="grid-heading">
        <h2 id="grid-heading" class="no-print mb-6 text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">Blank board</h2>

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
          class="flex w-full flex-col gap-px overflow-hidden rounded-md bg-qs-line p-px"
        >
          <!-- Top row: corner + 10 header cells -->
          <div class="grid-row" role="row">
            <div class="cell corner">
              <span>AWAY &#8595;</span>
              <span>HOME &#8594;</span>
            </div>
            @for (col of columns; track col) {
              <div class="cell axis-top" role="columnheader">
                <span class="sr-only">Home digit box {{ col }}</span>
              </div>
            }
          </div>

          <!-- 10 rows: side header + 10 squares -->
          @for (row of columns; track row) {
            <div class="grid-row" role="row">
              <div class="cell axis-side" role="rowheader">
                <span class="sr-only">Away digit box {{ row }}</span>
              </div>
              @for (col of columns; track col) {
                <div class="cell" role="gridcell"></div>
              }
            </div>
          }
        </div>

        <p class="mt-4 text-sm leading-relaxed text-qs-ink">
          <strong>How to read:</strong> Columns are the home team's last digit. Rows are the away team's last digit.
          Find the square where the row and column meet to see the winner.
        </p>
        <p class="mt-2 text-xs text-qs-muted">
          QuarterScore never collects, holds, or pays out money. quarterscore.com
        </p>
      </section>

      <app-reading-end class="no-print" [related]="related" [cta]="cta"></app-reading-end>
    </app-reading-page>
  `
})
export class PrintableBoardComponent {
  private seo = inject(SeoService);

  public readonly columns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  public readonly related: RelatedLink[] = [
    { path: '/how-to-play', label: 'How to play', text: 'The same rules, on a live board.' },
    { path: '/', label: 'Homepage', text: 'See a sample board and start a game.' },
    { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'The February 14, 2027 party board.' },
    { path: '/football-squares-on-tv', label: 'Football squares on TV', text: 'Put the live board on a big screen instead.' }
  ];
  public readonly cta: PageCta = {
    path: '/create',
    label: 'Skip the paper and run it live',
    note: 'Or keep both. The printable is free, and so is the online board.'
  };
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

}
