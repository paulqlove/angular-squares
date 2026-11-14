import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { PageCta, RelatedLink } from './marketing-pages';
import { PRE_NUMBERED_SEEDS, seededDigitOrder } from './printable-digits';
import { PrintableSheetComponent } from './printable-sheet.component';
import { ReadingEndComponent, ReadingHeaderComponent, ReadingPageComponent, ReadingSectionComponent } from './reading-layout.components';

@Component({
    selector: 'app-printable-board',
    imports: [ReadingPageComponent, ReadingHeaderComponent, ReadingSectionComponent, ReadingEndComponent, PrintableSheetComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-reading-page [breadcrumbs]="breadcrumbs">
      <app-reading-header class="no-print" eyebrow="Free templates" title="Printable football squares"
        lede="Free football squares sheets to print for any game, plus a Super Bowl squares template for February. Pick a 100-square grid, a 25-square sheet, or a board with the numbers already filled in. Write names first.">
        <div actions class="mt-8">
          <a href="assets/printable-football-squares.pdf" download="printable-football-squares.pdf" class="qs-btn qs-btn-primary">Download 100-square PDF</a>
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

      <app-printable-sheet heading="Blank 100-square board" headingId="grid-heading" gridLabel="Blank football squares grid"
        pdfHref="assets/printable-football-squares.pdf" pdfLabel="Download 100-square PDF"></app-printable-sheet>

      <app-printable-sheet heading="25-square sheet" headingId="grid-25-heading" gridLabel="Blank 25-square football squares grid"
        [size]="5" boxLabel="digit pair box"
        pdfHref="assets/printable-football-squares-25.pdf" pdfLabel="Download 25-square PDF">
        <p>Five rows by five columns, for a small group. Each side uses digit pairs (0&#8209;1, 2&#8209;3, 4&#8209;5, 6&#8209;7 and 8&#8209;9), so each square covers four scores.</p>
        <p>Fill in the names, then put the five pairs in a hat and draw them for each side.</p>
      </app-printable-sheet>

      <app-printable-sheet heading="Pre-numbered 100-square board" headingId="grid-numbered-heading" gridLabel="Pre-numbered football squares grid"
        [homeDigits]="homeDigits" [awayDigits]="awayDigits" [foldable]="true"
        pdfHref="assets/printable-football-squares-numbered.pdf" pdfLabel="Download pre-numbered PDF">
        <p>The digits 0 through 9 are already printed down the side and across the top, in a random order. Use it when your group would rather skip the draw.</p>
        <p>It stays fair if names go on first. Fold the top and side under while people sign, then unfold it before kickoff.</p>
      </app-printable-sheet>

      <app-reading-end class="no-print" [related]="related" [cta]="cta"></app-reading-end>
    </app-reading-page>
  `
})
export class PrintableBoardComponent {
  private seo = inject(SeoService);

  public readonly awayDigits: readonly number[] = seededDigitOrder(PRE_NUMBERED_SEEDS.away);
  public readonly homeDigits: readonly number[] = seededDigitOrder(PRE_NUMBERED_SEEDS.home);
  public readonly related: RelatedLink[] = [
    { path: '/how-to-play', label: 'How to play', text: 'The same rules, on a live board.' },
    { path: '/', label: 'Homepage', text: 'See a sample board and start a game.' },
    { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'Make the live board for February 14, 2027.' },
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
      title: 'Printable Football Squares and Templates — QuarterScore',
      description: 'Printable football squares and a free Super Bowl squares template: a blank 10 by 10 grid, a 25-square sheet and a pre-numbered board. Print or download.',
      path: '/printable-football-squares',
      headline: 'Printable football squares',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }

}
