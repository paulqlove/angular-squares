import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

import { CardMenuComponent, CardMenuItem } from '../../../../components/ui/card-menu/card-menu.component';
import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { GROUP_NAME_MAX, GroupRow, gameCountLabel } from '../../../../core/utils/game-groups';
import { CoHostSaved, DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardStore } from '../../services/dashboard.store';
import { GroupCoHostFieldComponent } from './group-cohost-field.component';

/**
 * The Groups sheet (Creative's g2): each group with its game count and ••• for Rename, Co-host and Delete, then New group.
 * A sheet on phones, a dialog from sm up. Names and the group's co-host (K2) are typed in place, in the row.
 */
@Component({
  selector: 'app-groups-sheet',
  imports: [CardMenuComponent, GroupCoHostFieldComponent, ModalComponent, NgIconComponent, NgTemplateOutlet],
  providers: [provideIcons({ heroPlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="groups.sheetOpen()" labelledBy="groups-sheet-title" phone="sheet" extraClass="flex max-h-[85dvh] flex-col text-qs-ink" (dismissed)="close()">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-qs-line px-4 pb-3 pt-2">
        <h3 id="groups-sheet-title" class="text-xl font-semibold">Groups</h3>
        <button type="button" class="-mr-2 min-h-11 rounded-btn px-2 text-base font-semibold hover:bg-qs-panel-2" (click)="close()">Done</button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        @for (row of store.groupRows(); track row.id) {
          @if (groups.editing() === row.id) {
            <ng-container *ngTemplateOutlet="nameField; context: { $implicit: row.name, label: 'Rename ' + row.name }"></ng-container>
          } @else if (groups.editingCoHost() === row.id) {
            <app-group-cohost-field [group]="row" [boards]="store.myGames()" [saving]="groups.saving()" (cancelled)="groups.editingCoHost.set(null)" (saved)="saveCoHost(row, $event)"></app-group-cohost-field>
          } @else {
            <div class="flex min-h-[72px] items-center gap-3 border-b border-qs-line">
              <div class="min-w-0 flex-1">
                <p class="truncate text-lg font-semibold">{{ row.name }}</p>
                <p class="truncate text-qs-muted">{{ countLabel(row.count) }}@if (row.coHost) { · Co-host {{ row.coHost.email }} }</p>
              </div>
              @if (groups.canEdit()) {
                <app-card-menu class="-mr-2 shrink-0" [items]="menu" [label]="'More actions for ' + row.name" (picked)="onMenu($event, row)"></app-card-menu>
              }
            </div>
          }
        }
        @if (groups.editing() === 'new') {
          <ng-container *ngTemplateOutlet="nameField; context: { $implicit: '', label: 'New group name' }"></ng-container>
        } @else if (groups.canEdit()) {
          <button type="button" class="qs-btn qs-btn-secondary mt-4 w-full" (click)="startNew()">
            <ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon>
            New group
          </button>
        }
        <p class="pb-5 pt-4 text-sm text-qs-muted">
          A game's More tab shows only the other games in its group. Players never see group names.
          @if (groups.canEdit()) {
            ••• holds Rename, Co-host and Delete. Deleting a group moves its games to No group.
          } @else {
            Groups can be changed with a Season Pass.
          }
        </p>
      </div>
    </app-modal>

    <ng-template #nameField let-name let-label="label">
      <form class="flex min-h-[72px] items-center gap-2 border-b border-qs-line py-2" (submit)="$event.preventDefault(); save(input.value)">
        <input #input class="qs-input min-w-0 flex-1" [value]="name" [attr.maxlength]="maxName" [attr.aria-label]="label" data-autofocus enterkeyhint="done" (keydown.escape)="$event.stopPropagation(); groups.editing.set(null)" />
        <button type="button" class="qs-btn qs-btn-ghost shrink-0 px-3" (click)="groups.editing.set(null)">Cancel</button>
        <button type="submit" class="qs-btn qs-btn-ink shrink-0 px-4" [disabled]="groups.saving()">Save</button>
      </form>
    </ng-template>
  `
})
export class GroupsSheetComponent {
  protected readonly countLabel = gameCountLabel;
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly maxName = GROUP_NAME_MAX;
  protected readonly menu: CardMenuItem[] = [{ id: 'rename', label: 'Rename' }, { id: 'cohost', label: 'Co-host' }, { id: 'delete', label: 'Delete', danger: true }];
  protected readonly store: DashboardStore = inject(DashboardStore);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly uid = computed<string>(() => this.store.currentUser()?.uid ?? '');

  protected close(): void {
    this.groups.editing.set(null);
    this.groups.editingCoHost.set(null);
    this.groups.sheetOpen.set(false);
  }

  protected async onMenu(action: string, row: GroupRow): Promise<void> {
    if (action === 'rename' || action === 'cohost') {
      this.edit(row.id, action);
      return;
    }
    const ungrouped = await this.groups.remove(this.uid(), row, this.store.myGames());
    if (!ungrouped) return;
    for (const game of this.store.myGames().filter(g => g.openListId === row.id)) {
      this.store.updateMyGame(game.id, g => ({ ...g, openListId: ungrouped }));
    }
  }

  /** Saves the group's co-host, then shows it on the games that got it or lost it. */
  protected async saveCoHost(row: GroupRow, typed: string): Promise<void> {
    const saved = await this.groups.saveCoHost(this.uid(), row, typed, this.store.myGames());
    if (saved) this.showCoHostOnGames(saved);
  }

  protected async save(typed: string): Promise<void> {
    await this.groups.saveName(this.uid(), typed);
  }

  protected startNew(): void {
    this.edit('new');
  }

  /** Opens the name field (rename, new) or the co-host field in place; one at a time. */
  private edit(id: string, field: 'rename' | 'cohost' = 'rename'): void {
    this.groups.editing.set(field === 'rename' ? id : null);
    this.groups.editingCoHost.set(field === 'cohost' ? id : null);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('form input')?.focus());
  }

  private showCoHostOnGames(saved: CoHostSaved): void {
    const cleared = { managerId: undefined, managerEmail: undefined, managerName: undefined };
    for (const id of saved.addTo) this.store.updateMyGame(id, g => ({ ...g, ...cleared, managerEmail: saved.email }));
    for (const id of saved.clearFrom) this.store.updateMyGame(id, g => ({ ...g, ...cleared }));
  }
}
