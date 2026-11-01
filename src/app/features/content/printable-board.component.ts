import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';

@Component({
  selector: 'app-printable-board',
  standalone: true,
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
  template: `
    <app-content-shell [wide]="true">
      <div class="no-print">
        <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      </div>
      <article>
        <header class="no-print max-w-3xl">
          <p class="text-sm font-semibold uppercase tracking-wide text-qs-accent text-qs-accent">
            Free grid
          </p>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
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
          <h2 id="grid-heading" class="text-2xl font-bold text-heading">Blank board</h2>
          <div class="mt-4 grid gap-3 text-sm text-default sm:grid-cols-2">
            <p><span class="font-semibold text-heading">Home team:</span> ____________________</p>
            <p><span class="font-semibold text-heading">Away team:</span> ____________________</p>
          </div>
          <p class="mt-2 text-sm text-muted md:hidden no-print">Scroll sideways to see the whole grid.</p>
          <div class="mt-4 max-w-full min-w-0 overflow-x-auto" tabindex="0" aria-label="Blank football squares grid.">
            <table class="print-grid w-full min-w-[720px] border-collapse text-center">
              <caption class="sr-only">
                Blank 10 by 10 football squares board. Header boxes are empty so you can write the drawn digits.
              </caption>
              <thead>
                <tr>
                  <th scope="col" class="w-16 bg-card p-2 text-xs font-semibold text-heading">Away \\ Home</th>
                  @for (column of columns; track column) {
                    <th scope="col" class="h-12 border border-slate-900 bg-white p-1 text-xs font-semibold text-slate-900">
                      <span class="sr-only">Home digit box {{ column }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of columns; track row) {
                  <tr>
                    <th scope="row" class="h-12 border border-slate-900 bg-white p-1 text-xs font-semibold text-slate-900">
                      <span class="sr-only">Away digit box {{ row }}</span>
                    </th>
                    @for (column of columns; track column) {
                      <td class="h-12 border border-slate-900 bg-white"></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="mt-4 max-w-3xl text-sm leading-relaxed text-default">
            Columns are the home team’s last digit. Rows are the away team’s last digit.
            Quarter Score never collects, holds, or pays out money.
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
      title: 'Printable Football Squares — Free 10 by 10 Grid — Quarter Score',
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
