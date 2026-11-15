import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { GroupPickerComponent } from '../../components/ui/group-picker/group-picker.component';
import { GameGroup, GroupChoice } from '../../core/utils/game-groups';

/**
 * Details' Group picker (Season Pass) and Co-host field, Group right above Co-host (Creative's K3, Paul OK'd the move),
 * so picking a group fills the co-host next to it. It only shows the fields and reports changes; the form keeps the state.
 */
@Component({
  selector: 'app-create-game-cohost',
  imports: [GroupPickerComponent],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groupsAllowed()) {
      <app-group-picker class="mt-5 block" [groups]="groups()" [value]="groupId()" [allowNew]="true" [askCoHost]="true" [coHostSeed]="coHost()" (changed)="groupChanged.emit($event)"></app-group-picker>
    }
    <div class="mt-5">
      <label for="new-game-manager" class="qs-label mb-2 block text-qs-muted">Co-host <span class="normal-case tracking-normal">(optional)</span></label>
      <input id="new-game-manager" type="email" [value]="coHost()" (input)="coHostChanged.emit($any($event.target).value)" placeholder="their@email.com" class="qs-input" />
      <p class="mt-2 text-xs text-qs-muted">{{ hint() }}</p>
    </div>
  `
})
export class CreateGameCoHostComponent {
  public readonly coHost = input<string>('');
  public readonly groupId = input<string | null>(null);
  public readonly groups = input<GameGroup[]>([]);
  public readonly groupsAllowed = input<boolean>(false);
  /** "From Church. Change it for just this game." while the group's co-host is in the field. */
  public readonly hint = input<string>('');
  public readonly coHostChanged = output<string>();
  public readonly groupChanged = output<GroupChoice>();
}
