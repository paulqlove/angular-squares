import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { GROUP_NAME_MAX, GameGroup, GroupChoice } from '../../../core/utils/game-groups';
import { COHOST_EMAIL_MAX } from '../../../core/utils/group-cohost';
import { DropdownComponent, DropdownOption } from '../dropdown/dropdown.component';

const NO_GROUP = '';
const NEW_GROUP = '+new';

/**
 * Edit game's Group picker (Creative's g3 and g4): the owner's groups, No group, and for the owner New group...,
 * which opens a name field in place. Create game also asks for the new group's co-host there, starting from the game's
 * Co-host field. Reports every change as a GroupChoice; the dialog saves it with the rest.
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
        @if (askCoHost()) {
          <label for="new-group-cohost" class="qs-label mt-3 text-qs-muted">{{ newName().trim() ? 'Co-host for ' + newName().trim() + ' games' : 'Co-host for this group' }} <span class="normal-case tracking-normal">(optional)</span></label>
          <input
            id="new-group-cohost"
            type="email"
            class="qs-input"
            placeholder="their@email.com"
            autocomplete="off"
            [attr.maxlength]="maxEmail"
            [value]="newCoHost()"
            (input)="typeCoHost($event)"
          />
          <p class="text-xs text-qs-muted">Filled in on every new game in this group.</p>
        }
      }
    </div>
  `
})
export class GroupPickerComponent {
  public readonly allowNew = input<boolean>(false);
  /** Create game: New group... also asks for the group's co-host. */
  public readonly askCoHost = input<boolean>(false);
  /** What the game's Co-host field holds, to start the new group's co-host from. */
  public readonly coHostSeed = input<string>('');
  public readonly changed = output<GroupChoice>();
  public readonly groups = input<GameGroup[]>([]);
  /** The group the board is in now, or null for No group. */
  public readonly value = input<string | null>(null);

  protected readonly maxEmail = COHOST_EMAIL_MAX;
  protected readonly maxName = GROUP_NAME_MAX;
  protected readonly newCoHost = signal<string>('');
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
    if (value === NEW_GROUP && this.askCoHost() && !this.newCoHost()) this.newCoHost.set(this.coHostSeed());
    this.emit();
  }

  protected typeCoHost(event: Event): void {
    this.newCoHost.set((event.target as HTMLInputElement).value);
    this.emit();
  }

  protected typeName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
    this.emit();
  }

  private emit(): void {
    const value = this.selected();
    if (value === NEW_GROUP) this.changed.emit({ groupId: null, newName: this.newName(), ...(this.askCoHost() ? { newCoHost: this.newCoHost() } : {}) });
    else this.changed.emit({ groupId: value || null });
  }
}
