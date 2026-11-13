import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronRight } from '@ng-icons/heroicons/outline';
import type { OpenBoardRow } from '../../../../core/utils/open-boards';
import { miniGridCells, miniGridClass } from '../../../../core/utils/mini-grid';

/** The same host's other open boards as compact cards, one tap to open. */
@Component({
  selector: 'app-open-boards-list',
  imports: [RouterLink, NgIconComponent],
  providers: [provideIcons({ heroChevronRight })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section aria-labelledby="open-boards-title">
      <p id="open-boards-title" class="qs-label text-qs-muted">More boards from this host</p>
      <!-- Each card spans three rows of the list and shares them (subgrid), so the title, matchup and details line up
           across a row even when one title wraps. Without subgrid the cards still match heights, the lines just don't align. -->
      <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        @for (r of visible(); track r.id) {
          <li class="row-span-3 grid grid-rows-subgrid gap-y-0">
            <a
              [routerLink]="['/game', r.id]"
              (click)="picked.emit()"
              class="qs-card row-span-3 grid min-h-11 grid-cols-[3.5rem_minmax(0,1fr)_auto] grid-rows-subgrid gap-x-3 gap-y-0.5 p-3 transition-colors hover:border-qs-accent"
            >
              <div [class]="'col-start-1 row-span-3 row-start-1 grid w-14 shrink-0 gap-px self-center rounded-[3px] bg-qs-line p-px ' + gridClass(r)" aria-hidden="true">
                @for (i of cells(r); track i) {
                  <span class="aspect-square" [class]="i < r.taken ? 'bg-qs-accent' : 'bg-qs-panel'"></span>
                }
              </div>
              <div class="col-start-2 row-start-1 flex min-w-0 items-start justify-between gap-2 self-start">
                <p translate="no" class="line-clamp-2 text-base font-semibold leading-snug text-qs-ink">{{ r.name }}</p>
                <span class="qs-badge qs-badge-ok shrink-0">{{ r.open }} open</span>
              </div>
              <p translate="no" class="col-start-2 row-start-2 truncate font-mono text-xs uppercase tracking-wider text-qs-muted">{{ r.awayTeam || 'Away' }} v {{ r.homeTeam || 'Home' }}</p>
              <p class="col-start-2 row-start-3 line-clamp-2 self-start text-xs tabular-nums text-qs-muted">{{ r.taken }}/{{ r.size }} taken · {{ r.pricePerSquare }} pts per square</p>
              <ng-icon name="heroChevronRight" class="col-start-3 row-span-3 row-start-1 self-center text-base text-qs-muted" aria-hidden="true"></ng-icon>
            </a>
          </li>
        }
      </ul>
      @if (rows.length > limit && !showAll) {
        <button type="button" class="qs-btn qs-btn-ghost mt-2" (click)="showAll = true">See all {{ rows.length }}</button>
      }
    </section>
  `
})
export class OpenBoardsListComponent {
  @Input() rows: OpenBoardRow[] = [];
  @Output() picked = new EventEmitter<void>();

  readonly limit = 6;
  showAll = false;

  cells(r: OpenBoardRow): number[] {
    return miniGridCells(r.size);
  }

  gridClass(r: OpenBoardRow): string {
    return miniGridClass(r.size);
  }

  visible(): OpenBoardRow[] {
    return this.showAll ? this.rows : this.rows.slice(0, this.limit);
  }
}
