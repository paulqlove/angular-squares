import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DigitPair, topDigitPairs } from '../content/digit-pair-ranks';
import { SQUARES_PROBABILITIES } from '../super-bowl-squares/utils/probability.utils';
import { HomeGridComponent } from './home-grid.component';
import { HomeGrid, fillingBoard, openCount } from './home-grids';

interface ScoreTile {
  quarter: string;
  score: string;
  winner: string;
}

interface CheckInRow {
  name: string;
  squares: number;
  confirmed: boolean;
}

/** The home page's features, each shown as the real piece of the app it describes. */
@Component({
  selector: 'app-home-features',
  imports: [RouterLink, HomeGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' },
  template: `
    <figure class="qs-card flex flex-col gap-5 p-4 sm:col-span-2 sm:p-[22px] md:flex-row md:items-start xl:row-span-2">
      <figcaption class="md:flex-1">
        <h3 class="text-lg font-semibold text-qs-ink">Live for everyone</h3>
        <p class="mt-1 text-[0.9375rem] text-qs-muted">Squares fill in for everyone the moment they're claimed.</p>
      </figcaption>
      <div class="rounded-inner border border-qs-line bg-qs-panel-2 p-3 md:w-[25rem] md:shrink-0">
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="qs-eyebrow qs-eyebrow-bar text-[11.5px]">Harbor vs Riverside</p>
          <span class="qs-badge qs-badge-warn">{{ open }} open</span>
        </div>
        <div class="qs-canvas p-3">
          <app-home-grid [grid]="board"></app-home-grid>
        </div>
      </div>
    </figure>

    <figure class="qs-card p-4 sm:p-[22px]">
      <figcaption>
        <h3 class="text-lg font-semibold text-qs-ink">Winners pick themselves</h3>
        <p class="mt-1 text-[0.9375rem] text-qs-muted">Live scores find each quarter's winning square.</p>
      </figcaption>
      <div class="mt-5 grid grid-cols-2 gap-1.5" aria-hidden="true">
        @for (tile of scores; track tile.quarter) {
          <div class="rounded-inner px-2 py-3 text-center" [class]="tile.winner ? 'bg-qs-tile-ok' : 'bg-qs-tile'">
            <p class="text-2xl font-semibold leading-none tracking-[-0.04em] text-qs-tile-ink tabular-nums">{{ tile.score }}</p>
            <p class="qs-label mt-2 text-[11.5px] text-qs-tile-muted">{{ tile.quarter }}{{ tile.winner ? ' · ' + tile.winner : '' }}</p>
          </div>
        }
      </div>
    </figure>

    <figure class="qs-card p-4 sm:p-[22px]">
      <figcaption>
        <h3 class="text-lg font-semibold text-qs-ink">Join with a name</h3>
        <p class="mt-1 text-[0.9375rem] text-qs-muted">Players pick squares with just a name. No account needed.</p>
      </figcaption>
      <div class="mt-5" aria-hidden="true">
        <p class="qs-label text-qs-muted">Your name</p>
        <p class="mt-2 flex min-h-11 items-center rounded-btn border border-qs-line-strong bg-qs-panel-2 px-4 text-base text-qs-ink">Jordan</p>
      </div>
    </figure>

    <figure class="qs-card p-4 sm:p-[22px]">
      <figcaption>
        <h3 class="text-lg font-semibold text-qs-ink">Check players in</h3>
        <p class="mt-1 text-[0.9375rem] text-qs-muted">Confirm who's in with one tap.</p>
      </figcaption>
      <ul class="mt-4 divide-y divide-qs-line" aria-hidden="true">
        @for (row of checkIns; track row.name) {
          <li class="flex min-h-11 items-center justify-between gap-3">
            <span class="text-[0.9375rem] text-qs-ink">{{ row.name }} <span class="text-qs-muted">· {{ row.squares }} squares</span></span>
            <span class="switch" [class.switch-on]="row.confirmed"></span>
          </li>
        }
      </ul>
    </figure>

    <figure id="probability-heatmap" class="qs-card flex flex-col p-4 sm:p-[22px] xl:col-span-2">
      <figcaption>
        <h3 class="text-lg font-semibold text-qs-ink">Square hit rates</h3>
        <p class="mt-1 text-[0.9375rem] text-qs-muted">How often each pair of last digits has ended a pro football game.</p>
      </figcaption>
      <table class="mt-4 w-full text-[0.9375rem]">
        <caption class="sr-only">The most common digit pairs</caption>
        <tbody>
          @for (pair of pairs; track pair.away + '-' + pair.home) {
            <tr class="border-t border-qs-line first:border-t-0">
              <th scope="row" class="w-24 py-2 text-left font-mono font-medium text-qs-ink">{{ pair.away }} and {{ pair.home }}</th>
              <td class="py-2 pr-4"><span class="block h-2 rounded-full bg-qs-line-strong" [style.width.%]="pair.share / pairs[0].share * 100"></span></td>
              <td class="w-14 py-2 text-right font-mono text-qs-ink tabular-nums">{{ pair.share }}%</td>
            </tr>
          }
        </tbody>
      </table>
      <a routerLink="/best-squares-numbers" class="mt-auto inline-flex min-h-11 items-center self-start pt-2 font-medium text-qs-ink underline underline-offset-2 hover:text-qs-accent">
        See the full number table
      </a>
    </figure>
  `,
  styles: [`
    .switch { position: relative; flex-shrink: 0; width: 44px; height: 26px; border-radius: 999px; background: var(--qs-line-strong); }
    .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 999px; background: var(--qs-panel); box-shadow: 0 1px 2px rgb(0 0 0 / .2); }
    .switch-on { background: var(--qs-accent); }
    .switch-on::after { transform: translateX(18px); }
  `]
})
export class HomeFeaturesComponent {
  public readonly board: HomeGrid = fillingBoard();
  public readonly checkIns: CheckInRow[] = [
    { name: 'Jordan', squares: 4, confirmed: true },
    { name: 'Sam', squares: 2, confirmed: false }
  ];
  public readonly open: number = openCount(this.board);
  public readonly pairs: DigitPair[] = topDigitPairs(SQUARES_PROBABILITIES, 4);
  public readonly scores: ScoreTile[] = [
    { quarter: 'Q1', score: '7–3', winner: 'JO' },
    { quarter: 'Q2', score: '17–10', winner: 'SA' },
    { quarter: 'Q3', score: '–', winner: '' },
    { quarter: 'Q4', score: '–', winner: '' }
  ];
}
