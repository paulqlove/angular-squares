import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { BreadcrumbItem, SeoService } from '../../core/services/seo.service';
import { SQUARES_PROBABILITIES } from '../super-bowl-squares/utils/probability.utils';
import { bottomDigitPairs, DigitPair, topDigitPairs } from './digit-pair-ranks';
import { PageCta, RelatedLink } from './marketing-pages';
import { ReadingEndComponent, ReadingHeaderComponent, ReadingPageComponent, ReadingSectionComponent } from './reading-layout.components';

@Component({
    selector: 'app-best-numbers',
    imports: [ReadingPageComponent, ReadingHeaderComponent, ReadingSectionComponent, ReadingEndComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-reading-page [breadcrumbs]="breadcrumbs">
      <app-reading-header
        eyebrow="Football squares hit rates"
        title="Best Super Bowl squares numbers"
        lede="You drew 7 and 0, and someone across the room groans at their 2 and 5. Some last digits do end pro football scores more often than others. This is the table behind the Hit rate tab on every board. It describes the past, not your game."
      ></app-reading-header>

      <app-reading-section heading="The short answer" headingId="answer-heading">
        <p>
          The best pair is {{ pairName(bestPairs[0]) }}, at about {{ bestPairs[0].share.toFixed(1) }} percent of past
          final scores either way round. Next come {{ pairName(bestPairs[1]) }} at {{ bestPairs[1].share.toFixed(1) }}
          and {{ pairName(bestPairs[2]) }} at about {{ bestPairs[2].share.toFixed(1) }}. The worst is
          {{ pairName(worstPairs[0]) }}, which rounds to {{ worstPairs[0].share.toFixed(1) }} percent, then
          {{ pairName(worstPairs[1]) }} at {{ worstPairs[1].share.toFixed(1) }}. An average square is 1 percent.
        </p>
      </app-reading-section>

      <app-reading-section heading="Why 0, 7, 3, and 4 lead" headingId="why-heading">
        <p>
          Football points come in chunks. A touchdown and extra point make 7, two make 14, and three make 21.
          A field goal adds 3, and scores like 10, 20 and 30 end in 0. The away team’s last digit is 0 about
          {{ awayShare(0) }} of the time and 7 about {{ awayShare(7) }}. Digits 2 and 5 take less common mixes
          of scores, so they sit near {{ awayShare(2) }} and {{ awayShare(5) }}.
        </p>
        <p>A rare square still comes up. The draw is random on purpose.</p>
      </app-reading-section>

      <app-reading-section heading="Every digit pair" headingId="table-heading">
        <p>
          Rows are the away team’s last digit, columns the home team’s. Each cell is that pair’s
          share of historical final scores, rounded.
        </p>
        <p class="text-sm text-qs-muted md:hidden">Scroll sideways to read every digit.</p>
        <div wide class="space-y-4">
              <div class="overflow-x-auto" tabindex="0" aria-label="Historical digit table. Scroll sideways if needed.">
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
              <ul class="mt-4 flex flex-wrap gap-3 text-sm text-qs-ink" aria-label="Color key">
                <li class="qs-heat-5 rounded-chip px-2 py-1 font-mono">3.0 or more</li>
                <li class="qs-heat-4 rounded-chip px-2 py-1 font-mono">2.0 to 2.9</li>
                <li class="qs-heat-3 rounded-chip px-2 py-1 font-mono">1.5 to 1.9</li>
                <li class="qs-heat-2 rounded-chip px-2 py-1 font-mono">1.0 to 1.4</li>
                <li class="qs-heat-1 rounded-chip px-2 py-1 font-mono">0.5 to 0.9</li>
                <li class="qs-heat-0 rounded-chip border border-qs-line px-2 py-1 font-mono">Under 0.5</li>
              </ul>
          <p class="text-xs text-qs-muted">
            Source:
            <a
              href="https://www.eldo.co/super-bowl-squares-odds-probabilities-best-worst-numbers.html"
              class="text-qs-accent underline underline-offset-2"
              rel="noopener noreferrer"
              target="_blank"
            >ELDORADO, Super Bowl squares frequencies</a>.
            This grid is the table already in the app.
          </p>
        </div>
      </app-reading-section>

      <app-reading-section heading="Use it for fun" headingId="luck-heading">
        <p>
          This is one grid for the whole game, because the source does not split it by quarter. Pull it up when
          someone gloats about their 7, or when the person holding a 5 needs some hope.
        </p>
        <ul class="list-disc space-y-2 pl-5">
          <li>Numbers are drawn after the names are on the board, so nobody gets to pick 7 and 0.</li>
          <li>History is not a promise. One safety or missed extra point can put a 2 or a 5 in play.</li>
          <li>Even the best pair is under 4 percent, so the winning square is often one nobody talked up.</li>
          <li>It is a party, not a math test. Bring the board for the company.</li>
        </ul>
      </app-reading-section>

      <app-reading-end [related]="related" [cta]="cta"></app-reading-end>
    </app-reading-page>
  `
})
export class BestNumbersComponent {
  constructor() {
    const away = Array(10).fill(0);
    for (const digit of this.digits) {
      for (const other of this.digits) {
        away[digit] += this.share(digit, other);
      }
    }
    this.awayTotals = away;

    this.seo.apply({
      title: 'Best Super Bowl Squares Numbers — QuarterScore',
      description: `The best Super Bowl squares numbers are ${this.pairName(this.bestPairs[0])}. The worst pair is ${this.pairName(this.worstPairs[0])}. See how often every last-digit pair has ended a past pro football game.`,
      path: '/best-squares-numbers',
      headline: 'Best Super Bowl squares numbers',
      published: '2026-11-01',
      breadcrumbs: this.breadcrumbs
    });
  }

  public readonly bestPairs: DigitPair[] = topDigitPairs(SQUARES_PROBABILITIES, 3);
  public readonly breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Best squares numbers', path: '/best-squares-numbers' }
  ];
  public readonly cta: PageCta = {
    path: '/create',
    label: 'Create a board',
    note: 'See the same colors on your own board after the numbers are drawn. QuarterScore never collects, holds, or pays out money.'
  };
  public readonly digits: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  public readonly related: RelatedLink[] = [
    { path: '/how-to-play', label: 'How to play', text: 'How the draw and the quarter winner work.' },
    { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'The February 14, 2027 board.' },
    { path: '/', fragment: 'probability-heatmap', label: 'Hit rates on the homepage', text: 'Where the in-game tab is introduced.' }
  ];
  public readonly worstPairs: DigitPair[] = bottomDigitPairs(SQUARES_PROBABILITIES, 2);

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

  public pairName(pair: DigitPair): string {
    return `${pair.away} and ${pair.home}`;
  }

  public share(away: number, home: number): number {
    return SQUARES_PROBABILITIES[`${away},${home}`] ?? 0;
  }

  private readonly awayTotals: number[];
  private readonly seo: SeoService = inject(SeoService);
}
