import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown, heroFolder } from '@ng-icons/heroicons/outline';

import { gameCountLabel } from '../../../../core/utils/game-groups';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardStore } from '../../services/dashboard.store';

/**
 * Desktop group picker (Creative's groups-row w1, w2), between Search and New board: the folder button names the group
 * Hosting shows, and its menu picks All groups or one group, with Manage groups for Season Pass owners.
 */
@Component({
  selector: 'app-group-menu',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown, heroFolder })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        class="flex h-11 w-[200px] items-center gap-2 rounded-btn border bg-qs-panel px-3 text-base text-qs-ink transition-colors hover:border-qs-ink"
        [class]="open() ? 'border-qs-ink' : 'border-qs-line-strong'"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'Groups: ' + groups.pickedName()"
        (click)="toggle()"
      >
        <ng-icon name="heroFolder" class="shrink-0 text-xl" aria-hidden="true"></ng-icon>
        <span class="min-w-0 flex-1 truncate text-left">{{ groups.pickedName() }}</span>
        <ng-icon name="heroChevronDown" class="shrink-0 text-base transition-transform duration-150" [class.rotate-180]="open()" aria-hidden="true"></ng-icon>
      </button>
      @if (open()) {
        <div role="menu" aria-label="Groups" animate.enter="qs-menu-enter" animate.leave="qs-menu-leave" class="absolute left-0 top-full z-30 mt-1.5 max-h-[60vh] w-[240px] origin-top-left overflow-y-auto rounded-inner border border-qs-line-strong bg-qs-panel p-1 shadow-pop">
          <button type="button" role="menuitemradio" [attr.aria-checked]="!groups.picked()" class="qs-group-item" (click)="pick(null)">
            <span class="min-w-0 flex-1 truncate">All groups</span>
            <span class="qs-group-end">@if (!groups.picked()) { <ng-icon name="heroCheck" class="-mr-0.5 text-lg" aria-hidden="true"></ng-icon> }</span>
          </button>
          @for (row of store.groupRows(); track row.id) {
            <button type="button" role="menuitemradio" [attr.aria-checked]="groups.picked()?.id === row.id" class="qs-group-item" (click)="pick(row.id)">
              <span class="min-w-0 flex-1 truncate">{{ row.name }}</span>
              <span class="qs-group-end text-sm tabular-nums text-qs-muted">
                @if (groups.picked()?.id === row.id) { <ng-icon name="heroCheck" class="-mr-0.5 text-lg text-qs-ink" aria-hidden="true"></ng-icon> } @else { <span aria-hidden="true">{{ row.count }}</span> }
                <span class="sr-only">, {{ countLabel(row.count) }}</span>
              </span>
            </button>
          }
          @if (groups.canEdit()) {
            <div class="mx-1 my-1 border-t border-qs-line" role="separator"></div>
            <button type="button" role="menuitem" class="qs-group-item" (click)="manage()">Manage groups</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .qs-group-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 0 12px; border-radius: 4px;
      text-align: left; font-size: 16px; color: var(--qs-ink); transition: background-color var(--qs-t-fast) var(--qs-ease); }
    .qs-group-item:hover, .qs-group-item:focus-visible { background: var(--qs-panel-2); outline: none; }
    /* One trailing slot per row: the check and the counts share its right edge (the picked row shows the check). */
    .qs-group-end { display: flex; flex-shrink: 0; justify-content: flex-end; align-items: center; min-width: 20px; }
  `]
})
export class GroupMenuComponent {
  protected readonly countLabel = gameCountLabel;
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly open = signal<boolean>(false);
  protected readonly store: DashboardStore = inject(DashboardStore);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.host.nativeElement.querySelector('button')?.focus();
  }

  protected manage(): void {
    this.open.set(false);
    this.groups.openManage();
  }

  protected pick(groupId: string | null): void {
    this.groups.pickedId.set(groupId);
    this.open.set(false);
  }

  protected toggle(): void {
    this.open.update(v => !v);
    if (this.open()) setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[role^="menuitem"]')?.focus());
  }
}
