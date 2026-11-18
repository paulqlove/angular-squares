import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronRight } from '@ng-icons/heroicons/outline';

import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { gameCountLabel } from '../../../../core/utils/game-groups';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardStore } from '../../services/dashboard.store';

/**
 * Phone group picker (Creative's groups-row p2), opened from the folder button in the bottom bar: All groups, each group
 * with its game count, and Manage groups for Season Pass owners. Picking a group closes the sheet. The picked row's check
 * takes its count's place, so checks and counts line up on one right edge.
 */
@Component({
  selector: 'app-group-pick-sheet',
  imports: [ModalComponent, NgIconComponent],
  providers: [provideIcons({ heroCheck, heroChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="groups.pickSheetOpen()" labelledBy="group-pick-title" phone="sheet" size="sm" extraClass="flex max-h-[85dvh] flex-col text-qs-ink" (dismissed)="close()">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-qs-line px-4 pb-3 pt-2">
        <h3 id="group-pick-title" class="text-xl font-semibold">Groups</h3>
        <button type="button" class="-mr-2 min-h-11 rounded-btn px-2 text-base font-semibold hover:bg-qs-panel-2" (click)="close()">Done</button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <div role="radiogroup" aria-labelledby="group-pick-title">
          <button type="button" role="radio" class="qs-pick-row" [attr.aria-checked]="!groups.picked()" (click)="pick(null)">
            <span class="min-w-0 flex-1 truncate">All groups</span>
            <span class="qs-pick-end">@if (!groups.picked()) { <ng-icon name="heroCheck" class="-mr-0.5 text-xl" aria-hidden="true"></ng-icon> }</span>
          </button>
          @for (row of store.groupRows(); track row.id) {
            <button type="button" role="radio" class="qs-pick-row" [attr.aria-checked]="groups.picked()?.id === row.id" (click)="pick(row.id)">
              <span class="min-w-0 flex-1 truncate">{{ row.name }}</span>
              <span class="qs-pick-end text-base text-qs-muted">
                @if (groups.picked()?.id === row.id) { <ng-icon name="heroCheck" class="-mr-0.5 text-xl text-qs-ink" aria-hidden="true"></ng-icon><span class="sr-only">{{ countLabel(row.count) }}</span> } @else { {{ countLabel(row.count) }} }
              </span>
            </button>
          }
        </div>
        @if (groups.canEdit()) {
          <button type="button" class="qs-pick-row" (click)="groups.openManage()">
            <span class="min-w-0 flex-1">Manage groups</span>
            <ng-icon name="heroChevronRight" class="-mr-1.5 shrink-0 text-xl text-qs-muted" aria-hidden="true"></ng-icon>
          </button>
        }
      </div>
    </app-modal>
  `,
  styles: [`
    .qs-pick-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; border-bottom: 1px solid var(--qs-line);
      text-align: left; font-size: 18px; color: var(--qs-ink); }
    .qs-pick-row:focus-visible { outline: 2px solid var(--qs-ink); outline-offset: -2px; }
    /* One trailing slot per row: the check and "N games" share its right edge (the picked row shows the check). */
    .qs-pick-end { display: flex; flex-shrink: 0; justify-content: flex-end; align-items: center; min-width: 24px; }
  `]
})
export class GroupPickSheetComponent {
  protected readonly countLabel = gameCountLabel;
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly store: DashboardStore = inject(DashboardStore);

  protected close(): void {
    this.groups.pickSheetOpen.set(false);
  }

  protected pick(groupId: string | null): void {
    this.groups.pickedId.set(groupId);
    this.close();
  }
}
