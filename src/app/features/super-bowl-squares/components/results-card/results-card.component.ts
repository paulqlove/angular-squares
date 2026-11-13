import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroShare } from '@ng-icons/heroicons/outline';
import { ResultsSummary } from '../../utils/results';
import { drawResultsImage } from '../../utils/results-image';

/**
 * The final score and each quarter's winner, shown at the top of the game page once the game is over. Share results
 * sends a 1080 by 1080 picture of the card through the phone's share sheet, or downloads it where sharing files isn't
 * supported.
 */
@Component({
  selector: 'app-results-card',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroShare })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = results();
    <section class="qs-card overflow-hidden" aria-labelledby="results-heading">
      <div class="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <!-- Score -->
        <div class="flex flex-col bg-qs-tile p-5 text-qs-tile-ink lg:p-6">
          <div class="flex items-baseline justify-between gap-4">
            <h2 id="results-heading" class="qs-label min-w-0 truncate leading-normal text-qs-tile-muted">Final · {{ r.title }}</h2>
            @if (r.date) {
              <p class="qs-label shrink-0 leading-normal text-qs-tile-muted">{{ r.date }}</p>
            }
          </div>
          <!-- Phone: one team per line with its score on the right. Desktop: away, the score, home on one line. -->
          <div class="mt-6 grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 lg:mt-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-y-0">
            <div class="min-w-0">
              <p class="qs-label leading-normal text-qs-tile-muted">Away</p>
              <p class="mt-1 truncate text-xl font-semibold">{{ r.awayTeam }}</p>
            </div>
            <p class="qs-title text-right text-[44px] leading-none tabular-nums lg:hidden">{{ r.away }}</p>
            <p class="qs-title hidden whitespace-nowrap text-center text-[64px] leading-none tabular-nums lg:block">
              {{ r.away }}<span class="text-qs-tile-muted" aria-hidden="true"> – </span><span class="sr-only"> to </span>{{ r.home }}
            </p>
            <div class="min-w-0 lg:text-right">
              <p class="qs-label leading-normal text-qs-tile-muted">Home</p>
              <p class="mt-1 truncate text-xl font-semibold">{{ r.homeTeam }}</p>
            </div>
            <p class="qs-title text-right text-[44px] leading-none tabular-nums lg:hidden">{{ r.home }}</p>
          </div>
        </div>

        <!-- Winners -->
        <div class="px-5 pt-4 lg:px-5">
          <div class="flex items-center justify-between border-b border-qs-line pb-3">
            <h3 class="qs-label text-qs-ink">Winners</h3>
            <span class="qs-label text-qs-muted" aria-hidden="true">Score</span>
          </div>
          <ul>
            @for (row of r.rows; track row.label) {
              <li class="grid min-h-[67px] grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-qs-line py-3 last:border-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                <span class="qs-label text-qs-muted">{{ row.label }}</span>
                <span class="flex min-w-0 items-center gap-3">
                  @if (row.name) {
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-inner bg-[var(--qs-win)] font-mono text-xs font-semibold text-[var(--qs-win-ink)]" aria-hidden="true">{{ row.initials }}</span>
                  } @else {
                    <span class="h-9 w-9 shrink-0 rounded-inner border-2 border-dashed border-qs-line-strong" aria-hidden="true"></span>
                  }
                  <span class="min-w-0">
                    <span class="block truncate font-medium" [class.text-qs-muted]="!row.name">{{ row.name ?? 'Empty square' }}</span>
                    @if (row.square) {
                      <span class="block font-mono text-xs text-qs-muted">{{ row.square }}</span>
                    }
                  </span>
                </span>
                <span class="whitespace-nowrap text-lg font-semibold tabular-nums">
                  @if (row.score; as s) {
                    <span class="sr-only">Score </span>{{ s.away }}<span class="text-qs-muted" aria-hidden="true"> – </span><span class="sr-only"> to </span>{{ s.home }}
                  } @else {
                    <span class="text-qs-muted">–</span>
                  }
                </span>
              </li>
            }
          </ul>
        </div>
      </div>

      <button type="button" (click)="share()" [disabled]="sharing()"
        class="flex min-h-11 w-full items-center justify-center gap-2 border-t border-qs-line px-4 py-3 text-sm font-medium text-qs-ink transition-colors hover:bg-qs-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-qs-accent disabled:opacity-60">
        <ng-icon name="heroShare" class="text-base" aria-hidden="true"></ng-icon>
        Share results
      </button>
    </section>
  `
})
export class ResultsCardComponent implements OnDestroy {
  constructor() {
    // Draw the picture ahead of the tap, so the share sheet opens straight from it. Safari only opens it from a tap.
    effect(() => {
      const summary = this.results();
      if (!this.isBrowser) return;
      clearTimeout(this.prepareTimer);
      this.file = null;
      this.prepareTimer = setTimeout(() => this.prepare(summary), 400);
    });
  }

  results = input.required<ResultsSummary>();
  sharing = signal(false);

  ngOnDestroy(): void {
    clearTimeout(this.prepareTimer);
  }

  /** Opens the share sheet with the picture, or downloads it where the browser can't share files. */
  async share(): Promise<void> {
    if (this.sharing()) return;
    this.sharing.set(true);
    try {
      const file = this.file ?? (await this.prepare(this.results()));
      if (!file) return;
      const data = shareData(file);
      if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if ((error as DOMException)?.name === 'AbortError') return;
        }
      }
      download(file);
    } finally {
      this.sharing.set(false);
    }
  }

  private file: File | null = null;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private prepareTimer: ReturnType<typeof setTimeout> | undefined;

  private async prepare(summary: ResultsSummary): Promise<File | null> {
    try {
      const blob = await drawResultsImage(summary);
      const file = new File([blob], FILE_NAME, { type: 'image/png' });
      if (summary === this.results()) this.file = file;
      return file;
    } catch {
      return null;
    }
  }
}

const FILE_NAME = 'quarterscore-results.png';

/**
 * What the share sheet gets: the picture and nothing else. iPhones turn each extra field (a title or text) into
 * another item, so Copy put more than one thing on the clipboard.
 */
export function shareData(file: File): ShareData {
  return { files: [file] };
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
