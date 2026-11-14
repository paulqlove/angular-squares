import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';

/**
 * One printable squares sheet: heading, how-to lines (projected), download and print buttons, then the
 * paper grid. The header boxes stay blank to fill after the draw, or show digits when they are given.
 * "Print this sheet" prints only this sheet (styles.scss hides the others).
 */
@Component({
  selector: 'app-printable-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'print-sheet mt-20 block border-t border-qs-line pt-8 print:mt-0 print:border-0 print:pt-0',
    '[class.print-chosen]': 'chosen()'
  },
  styles: `
    .board { --side: 2.5rem; max-width: calc(var(--size) * 7rem + var(--side)); }
    .grid-row { display: grid; grid-template-columns: var(--side) repeat(var(--size), 1fr); gap: 1px; }
    .cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 500; background: white; }
    .axis-top, .axis-side, .corner { background: #f1f5f9; color: #94a3b8; }
    .axis-top, .corner { aspect-ratio: auto; height: 1.5rem; }
    .axis-side { aspect-ratio: auto; }
    .corner { color: #5b6b81; font-size: 0.5rem; flex-direction: column; line-height: 1.2; white-space: nowrap; }
    .digit { color: #0f172a; font-size: 1rem; font-weight: 700; }
    .fold .axis-top, .fold .corner { border-bottom: 2px dashed #0f172a; }
    .fold .axis-side, .fold .corner { border-right: 2px dashed #0f172a; }
    @media (min-width: 640px) {
      .board { --side: 3rem; }
      .cell { font-size: 0.75rem; }
      .axis-top, .corner { height: 2.25rem; }
      .corner { font-size: 0.625rem; }
      .digit { font-size: 1.25rem; }
    }
    /* Paper: real borders, because browsers leave out background colors when printing by default. */
    @media print {
      .board { max-width: none; gap: 0; padding: 0; border-radius: 0; background: none; border-top: 1pt solid #000; border-left: 1pt solid #000; }
      .grid-row { gap: 0; }
      .cell { border-right: 1pt solid #000; border-bottom: 1pt solid #000; }
      .fold .axis-top, .fold .corner { border-bottom: 2pt dashed #000; }
      .fold .axis-side, .fold .corner { border-right: 2pt dashed #000; }
    }
  `,
  template: `
    <section [attr.aria-labelledby]="headingId()">
      <h2 [id]="headingId()" class="no-print text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">{{ heading() }}</h2>
      <div class="no-print qs-body mt-4 max-w-[40rem] space-y-3 text-[1.0625rem] leading-[1.7] empty:hidden"><ng-content></ng-content></div>
      <div class="no-print mb-6 mt-6 flex flex-wrap gap-3">
        <a [href]="pdfHref()" [attr.download]="pdfFileName()" class="qs-btn qs-btn-secondary">{{ pdfLabel() }}</a>
        <button type="button" (click)="printSheet()" class="qs-btn qs-btn-secondary">Print this sheet</button>
      </div>

      <div class="mb-4 hidden items-center justify-between print:flex">
        <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" width="192" height="24" class="h-6 w-auto">
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

      <div role="grid" [attr.aria-label]="gridLabel()" [class.fold]="foldable()" [style.--size]="size()"
        class="board flex w-full flex-col gap-px overflow-hidden rounded-md bg-qs-line p-px">
        <div class="grid-row" role="row">
          <div class="cell corner"><span>AWAY &#8595;</span><span>HOME &#8594;</span></div>
          @for (slot of slots(); track slot) {
            <div class="cell axis-top" role="columnheader">
              @if (homeDigits(); as digits) {
                <span class="digit"><span class="sr-only">Home </span>{{ digits[slot] }}</span>
              } @else {
                <span class="sr-only">Home {{ boxLabel() }} {{ slot + 1 }}</span>
              }
            </div>
          }
        </div>
        @for (row of slots(); track row) {
          <div class="grid-row" role="row">
            <div class="cell axis-side" role="rowheader">
              @if (awayDigits(); as digits) {
                <span class="digit"><span class="sr-only">Away </span>{{ digits[row] }}</span>
              } @else {
                <span class="sr-only">Away {{ boxLabel() }} {{ row + 1 }}</span>
              }
            </div>
            @for (slot of slots(); track slot) {
              <div class="cell" role="gridcell"></div>
            }
          </div>
        }
      </div>

      <p class="mt-4 text-sm leading-relaxed text-qs-ink">
        <strong>How to read:</strong> Columns are the home team's last digit. Rows are the away team's last digit.
        Find the square where the row and column meet to see the winner.
      </p>
      <p class="mt-2 text-xs text-qs-muted">QuarterScore never collects, holds, or pays out money. quarterscore.com</p>
    </section>
  `
})
export class PrintableSheetComponent {
  /*******************************\
   *     Public Properties       *
  \*******************************/

  //
  // Digits down the side, top to bottom; null leaves the boxes blank for the draw
  //
  public readonly awayDigits = input<readonly number[] | null>(null);

  //
  // What a blank header box is called for screen readers ("digit box", "digit pair box")
  //
  public readonly boxLabel = input<string>('digit box');

  //
  // Dashed lines along the header row and column, for folding the numbers under while people sign
  //
  public readonly foldable = input<boolean>(false);

  //
  // Accessible name of the grid
  //
  public readonly gridLabel = input.required<string>();

  //
  // Visible sheet heading
  //
  public readonly heading = input.required<string>();

  //
  // Id of the heading, which labels the section
  //
  public readonly headingId = input.required<string>();

  //
  // Digits across the top, left to right; null leaves the boxes blank for the draw
  //
  public readonly homeDigits = input<readonly number[] | null>(null);

  //
  // The sheet's PDF and its button text
  //
  public readonly pdfHref = input.required<string>();
  public readonly pdfLabel = input.required<string>();

  //
  // Squares per side (10 for 100 squares, 5 for 25)
  //
  public readonly size = input<number>(10);

  /*******************************\
   *     Public Functions        *
  \*******************************/

  //
  // Prints this sheet alone, then puts the page back
  //
  public printSheet(): void {
    const root = this.document.documentElement;
    const view = this.document.defaultView;
    this.chosen.set(true);
    root.classList.add('print-one-sheet');
    view?.addEventListener('afterprint', () => {
      root.classList.remove('print-one-sheet');
      this.chosen.set(false);
    }, { once: true });
    setTimeout(() => view?.print(), 50);
  }

  /*******************************\
   *    Protected Properties     *
  \*******************************/

  //
  // True while this sheet is the one being printed
  //
  protected readonly chosen = signal<boolean>(false);

  //
  // Download name, taken from the PDF path
  //
  protected readonly pdfFileName = computed<string>(() => this.pdfHref().split('/').pop() ?? '');

  //
  // 0..size-1, for the rows and columns
  //
  protected readonly slots = computed<number[]>(() => Array.from({ length: this.size() }, (_, i) => i));

  /*******************************\
   *     Private Properties      *
  \*******************************/

  private readonly document = inject(DOCUMENT);
}
