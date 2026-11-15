import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown, heroFolder } from '@ng-icons/heroicons/outline';

import { GroupRow, gameCountLabel } from '../../../../core/utils/game-groups';

/** Why the group picker is off on the Players tab: desktop hover and a phone tap both say it. */
export const GROUPS_OFF_HINT = 'Groups filter your boards';

/**
 * Desktop group filter: the folder button names the picked group, and its menu picks All groups or one group.
 * On the dashboard (Creative's groups-row w1, w2) it sits between Search and New board, with Manage groups for Season
 * Pass owners; on the Players tab it stays in its spot but `off` (aria-disabled, so hovering it still explains why).
 * TV mode uses it right-aligned, without Manage groups. It only shows and reports picks; the caller owns the state.
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
        class="flex w-[200px] items-center gap-2 rounded-btn border px-3 text-base transition-colors"
        [class]="buttonClass()"
        [attr.aria-disabled]="off() ? 'true' : null"
        [attr.aria-haspopup]="off() ? null : 'menu'"
        [attr.aria-expanded]="off() ? null : open()"
        [attr.aria-label]="off() ? hint : 'Groups: ' + pickedName()"
        [attr.title]="off() ? hint : null"
        (click)="toggle()"
      >
        <ng-icon name="heroFolder" class="shrink-0 text-xl" aria-hidden="true"></ng-icon>
        <span class="min-w-0 flex-1 truncate text-left">{{ pickedName() }}</span>
        <ng-icon name="heroChevronDown" class="shrink-0 text-base transition-transform duration-150" [class.rotate-180]="open()" aria-hidden="true"></ng-icon>
      </button>
      @if (open() && !off()) {
        <div role="menu" aria-label="Groups" animate.enter="qs-menu-enter" animate.leave="qs-menu-leave" class="absolute top-full z-30 mt-1.5 max-h-[60vh] w-[240px] overflow-y-auto rounded-inner border border-qs-line-strong bg-qs-panel p-1 shadow-pop"
          [class]="alignRight() ? 'right-0 origin-top-right' : 'left-0 origin-top-left'">
          <button type="button" role="menuitemradio" [attr.aria-checked]="!pickedRow()" class="qs-group-item" (click)="pick(null)">
            <span class="min-w-0 flex-1 truncate">All groups</span>
            <span class="qs-group-end">@if (!pickedRow()) { <ng-icon name="heroCheck" class="-mr-0.5 text-lg" aria-hidden="true"></ng-icon> }</span>
          </button>
          @for (row of rows(); track row.id) {
            <button type="button" role="menuitemradio" [attr.aria-checked]="pickedRow()?.id === row.id" class="qs-group-item" (click)="pick(row.id)">
              <span class="min-w-0 flex-1 truncate">{{ row.name }}</span>
              <span class="qs-group-end text-sm tabular-nums text-qs-muted">
                @if (pickedRow()?.id === row.id) { <ng-icon name="heroCheck" class="-mr-0.5 text-lg text-qs-ink" aria-hidden="true"></ng-icon> } @else { <span aria-hidden="true">{{ row.count }}</span> }
                <span class="sr-only">, {{ countLabel(row.count) }}</span>
              </span>
            </button>
          }
          @if (canManage()) {
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
  /** Opens the menu under the button's right edge, for a button near the right side of the screen. */
  public readonly alignRight = input<boolean>(false);
  /** Shows Manage groups at the bottom of the menu. */
  public readonly canManage = input<boolean>(false);
  /** The 36px height of TV mode's header buttons, instead of the dashboard's 44px. */
  public readonly compact = input<boolean>(false);
  public readonly manageGroups = output<void>();
  /** Switched off in place: the Players tab has nothing for a group to filter. */
  public readonly off = input<boolean>(false);
  public readonly openChange = output<boolean>();
  /** The picked group's id, or null for All groups. An id that is not in `rows` reads as All groups. */
  public readonly pickedId = input<string | null>(null);
  public readonly groupPicked = output<string | null>();
  /** Each group with how many boards are filed in it. */
  public readonly rows = input<GroupRow[]>([]);

  protected readonly buttonClass = computed<string>(() => `${this.compact() ? 'h-9' : 'h-11'} ${this.off()
    ? 'qs-ctrl-off'
    : `${this.open() ? 'border-qs-ink' : 'border-qs-line-strong'} bg-qs-panel text-qs-ink hover:border-qs-ink`}`);
  protected readonly countLabel = gameCountLabel;
  protected readonly hint = GROUPS_OFF_HINT;
  protected readonly open = signal<boolean>(false);
  protected readonly pickedRow = computed<GroupRow | undefined>(() => this.rows().find(row => row.id === this.pickedId()));
  protected readonly pickedName = computed<string>(() => this.pickedRow()?.name ?? 'All groups');
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.setOpen(false);
  }

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    if (!this.open()) return;
    this.setOpen(false);
    this.host.nativeElement.querySelector('button')?.focus();
  }

  protected manage(): void {
    this.setOpen(false);
    this.manageGroups.emit();
  }

  protected pick(groupId: string | null): void {
    this.groupPicked.emit(groupId);
    this.setOpen(false);
  }

  protected toggle(): void {
    if (this.off()) return;
    this.setOpen(!this.open());
    if (this.open()) setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[role^="menuitem"]')?.focus());
  }

  private setOpen(open: boolean): void {
    this.open.set(open);
    this.openChange.emit(open);
  }
}
