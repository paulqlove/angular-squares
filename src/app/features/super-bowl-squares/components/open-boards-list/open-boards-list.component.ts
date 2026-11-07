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
      <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        @for (r of visible(); track r.id) {
          <li>
            <a [routerLink]="['/game', r.id]" (click)="picked.emit()" class="qs-card flex min-h-11 items-center gap-3 p-3 transition-colors hover:border-qs-accent">
              <div [class]="'grid w-14 shrink-0 gap-px rounded-[3px] bg-qs-line p-px ' + gridClass(r)" aria-hidden="true">
                @for (i of cells(r); track i) {
                  <span class="aspect-square" [class]="i < r.taken ? 'bg-qs-accent' : 'bg-qs-panel'"></span>
                }
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="line-clamp-2 text-base font-semibold leading-snug text-qs-ink">{{ r.name }}</p>
                  <span class="qs-badge qs-badge-ok shrink-0">{{ r.open }} open</span>
                </div>
                <p class="truncate font-mono text-xs uppercase tracking-wider text-qs-muted">{{ r.awayTeam || 'Away' }} v {{ r.homeTeam || 'Home' }}</p>
                <p class="line-clamp-2 text-xs tabular-nums text-qs-muted">{{ r.taken }}/{{ r.size }} taken · {{ r.pricePerSquare }} pts per square</p>
              </div>
              <ng-icon name="heroChevronRight" class="shrink-0 text-base text-qs-muted" aria-hidden="true"></ng-icon>
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
