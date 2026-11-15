import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

import { GroupPickerComponent } from '../../../../components/ui/group-picker/group-picker.component';
import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { GroupChoice, showsWhenPicked } from '../../../../core/utils/game-groups';
import { GamePageGroupsService } from '../../services/game-page-groups.service';
import { GameStateService } from '../../services/game-state.service';

/**
 * A co-host's Edit game (Creative's g4): Show in my open boards and the owner's groups to file the game in.
 * Nothing else: the rest of Edit game stays the owner's. Opens from the co-host's Edit button once the owner has a group.
 */
@Component({
  selector: 'app-cohost-edit-dialog',
  imports: [GroupPickerComponent, ModalComponent, NgIconComponent, ToggleComponent],
  providers: [provideIcons({ heroXMark })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="groups.coHostEditOpen()" labelledBy="cohost-edit-title" phone="sheet" extraClass="flex flex-col text-qs-ink" (dismissed)="close()">
      <div class="flex items-center justify-between gap-3 border-b border-qs-line px-5 pb-3 pt-2">
        <h3 id="cohost-edit-title" class="text-xl font-semibold">Edit game</h3>
        <button type="button" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close" (click)="close()">
          <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
        </button>
      </div>
      <div class="flex flex-col gap-6 px-5 py-5">
        @if (groups.coHostCanShow()) {
          <div class="flex min-h-11 items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="qs-label text-qs-ink">Show in my open boards</p>
              <p class="mt-1.5 text-xs text-qs-muted">Players on your other games can see and join this one.</p>
            </div>
            <app-toggle [checked]="shown()" (onChange)="shown.set($event)"></app-toggle>
          </div>
        }
        <app-group-picker [groups]="groups.groups()" [value]="choice()?.groupId ?? null" (changed)="pickGroup($event)"></app-group-picker>
      </div>
      <div class="flex gap-2 border-t border-qs-line px-5 pb-5 pt-3">
        <button type="button" class="qs-btn qs-btn-secondary w-28 shrink-0" (click)="close()">Cancel</button>
        <button type="button" class="qs-btn qs-btn-ink min-w-0 flex-1" [disabled]="groups.saving()" (click)="save()">
          {{ groups.saving() ? 'Saving...' : 'Save changes' }}
        </button>
      </div>
    </app-modal>
  `
})
export class CoHostEditDialogComponent {
  constructor() {
    // Each open starts from the board as it is now
    effect(() => {
      if (!this.groups.coHostEditOpen()) return;
      untracked(() => {
        this.shown.set(this.state.showInOpenBoards);
        this.choice.set(this.groups.choice());
      });
    });
  }

  protected readonly choice = signal<GroupChoice | undefined>(undefined);
  protected readonly groups: GamePageGroupsService = inject(GamePageGroupsService);
  protected readonly shown = signal<boolean>(false);
  private readonly state: GameStateService = inject(GameStateService);

  protected close(): void {
    this.groups.coHostEditOpen.set(false);
  }

  protected pickGroup(choice: GroupChoice): void {
    if (showsWhenPicked(this.choice(), choice)) this.shown.set(true);
    this.choice.set(choice);
  }

  protected save(): void {
    void this.groups.saveCoHostEdit(this.shown(), this.choice());
  }
}
