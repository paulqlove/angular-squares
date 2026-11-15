import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { GROUP_NAME_MAX, GameGroup, GroupChoice } from '../../../core/utils/game-groups';
import { DropdownComponent, DropdownOption } from '../dropdown/dropdown.component';

const NO_GROUP = '';
const NEW_GROUP = '+new';

/**
 * Edit game's Group picker (Creative's g3 and g4): the owner's groups, No group, and for the owner New group...,
 * which opens a name field in place. Reports every change as a GroupChoice; the dialog saves it with the rest.
 */
@Component({
  selector: 'app-group-picker',
  imports: [DropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <span id="group-picker-label" class="qs-label text-qs-muted">Group</span>
      <app-dropdown class="block" [fill]="true" ariaLabel="Group" [options]="options()" [value]="selected()" (valueChange)="pick($event)"></app-dropdown>
      @if (selected() === newGroup) {
        <input
          type="text"
          class="qs-input"
          aria-label="New group name"
          placeholder="Group name"
          [attr.maxlength]="maxName"
          [value]="newName()"
          (input)="typeName($event)"
        />
      }
    </div>
  `
})
export class GroupPickerComponent {
  public readonly allowNew = input<boolean>(false);
  public readonly changed = output<GroupChoice>();
  public readonly groups = input<GameGroup[]>([]);
  /** The group the board is in now, or null for No group. */
  public readonly value = input<string | null>(null);

  protected readonly maxName = GROUP_NAME_MAX;
  protected readonly newGroup = NEW_GROUP;
  protected readonly newName = signal<string>('');
  protected readonly options = computed<DropdownOption[]>(() => [
    ...this.groups().map(g => ({ value: g.id, label: g.name })),
    { value: NO_GROUP, label: 'No group' },
    ...(this.allowNew() ? [{ value: NEW_GROUP, label: 'New group...' }] : [])
  ]);
  protected readonly picked = signal<string | null>(null);
  protected readonly selected = computed<string>(() => this.picked() ?? this.value() ?? NO_GROUP);

  protected pick(value: string): void {
    this.picked.set(value);
    this.emit();
  }

  protected typeName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
    this.emit();
  }

  private emit(): void {
    const value = this.selected();
    if (value === NEW_GROUP) this.changed.emit({ groupId: null, newName: this.newName() });
    else this.changed.emit({ groupId: value || null });
  }
}
