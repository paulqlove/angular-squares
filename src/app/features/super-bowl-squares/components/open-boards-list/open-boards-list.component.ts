import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { OpenBoardRow } from '../../../../core/utils/open-boards';

/** On a full board: the same host's other open boards, one tap to join. */
@Component({
  selector: 'app-open-boards-list',
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="qs-card mb-4 p-5" aria-labelledby="open-boards-title">
      <p id="open-boards-title" class="qs-label text-qs-muted">More boards from this host</p>
      <ul class="mt-3 space-y-2">
        @for (r of visible(); track r.id) {
          <li>
            <a [routerLink]="['/game', r.id]" (click)="picked.emit()" class="block rounded-inner border border-qs-line bg-qs-panel-2 p-4 transition-colors hover:border-qs-accent">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-lg font-semibold text-qs-ink">{{ r.name }}</p>
                  <p class="truncate font-mono text-xs uppercase tracking-wider text-qs-muted">{{ r.awayTeam || 'Away' }} v {{ r.homeTeam || 'Home' }}</p>
                </div>
                <span class="qs-badge qs-badge-ok shrink-0">{{ r.open }} open</span>
              </div>
              <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-qs-line" aria-hidden="true">
                <div class="h-full bg-qs-accent" [style.width.%]="(r.taken / r.size) * 100"></div>
              </div>
              <p class="mt-2 text-sm text-qs-muted">{{ r.taken }}/{{ r.size }} taken</p>
              <p class="text-sm text-qs-muted">Points per square: {{ r.pricePerSquare }} · Total points on the board: {{ r.totalPoints | number }}</p>
            </a>
          </li>
        }
      </ul>
      @if (rows.length > 3 && !showAll) {
        <button type="button" class="qs-btn qs-btn-ghost mt-2" (click)="showAll = true">See all {{ rows.length }}</button>
      }
    </section>
  `
})
export class OpenBoardsListComponent {
  @Input() rows: OpenBoardRow[] = [];
  @Output() picked = new EventEmitter<void>();

  showAll = false;

  visible(): OpenBoardRow[] {
    return this.showAll ? this.rows : this.rows.slice(0, 3);
  }
}
