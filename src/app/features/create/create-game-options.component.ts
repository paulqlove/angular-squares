import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GroupPickerComponent } from '../../components/ui/group-picker/group-picker.component';
import { ToggleComponent } from '../../components/ui/toggle/toggle.component';
import { GROUPED_SHOWN_HINT, GameGroup, GroupChoice } from '../../core/utils/game-groups';

/**
 * The switches under Details: Show in my open boards, Group and Auto-lock and draw.
 * It only shows each choice and reports changes; the form keeps the state.
 */
@Component({
  selector: 'app-create-game-options',
  imports: [GroupPickerComponent, ToggleComponent],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="divide-y divide-qs-line border-t border-qs-line">
  @if (openBoardsAllowed()) {
    <div class="flex items-start justify-between gap-4 py-5 first:pt-5">
      <div class="min-w-0">
        <p class="qs-label mb-2 text-qs-ink">Show in my open boards</p>
        <p class="text-xs text-qs-muted">{{ grouped() ? groupedHint : 'Players on your other boards can join this one.' }}</p>
        <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">{{ openBoardPreview() }}</p>
      </div>
      <app-toggle [checked]="showInOpenBoards()" [disabled]="grouped()" (onChange)="openBoardsChanged.emit($event)"></app-toggle>
    </div>
  }
  @if (groupsAllowed()) {
    <app-group-picker class="block py-5" [groups]="groups()" [value]="groupId()" [allowNew]="true" (changed)="groupChanged.emit($event)"></app-group-picker>
  }
  @if (gamePicked()) {
    @if (autoManageAllowed()) {
      <div class="py-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="qs-label mb-2 text-qs-ink">Auto-lock and draw</p>
            <p class="text-xs text-qs-muted">5 minutes after kickoff, we lock the board and draw the numbers for you.</p>
            @if (autoManage() && autoRunText()) {
              <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">Locks {{ autoRunText() }}</p>
            }
              <details class="mt-1 text-xs text-qs-muted"><summary class="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">How it works</summary><p class="pb-1">If the board is not full it first moves to 50 or 25 squares (squares are shuffled, each player keeps their count). Players can pick until then. Cancel any time before it runs.</p></details>
          </div>
          <app-toggle [checked]="autoManage()" (onChange)="autoManageChanged.emit($event)"></app-toggle>
        </div>
      </div>
    } @else {
      <p class="py-5 text-sm text-qs-muted"><span class="qs-label mr-2 text-qs-ink">Auto-lock and draw</span>Comes with the Season Pass.</p>
    }
  }
</div>
`
})
export class CreateGameOptionsComponent {
  public readonly openBoardsAllowed = input(false);
  public readonly showInOpenBoards = input(false);
  /** The Group picker is on a group, so the switch is locked on. */
  public readonly grouped = input(false);
  /** How the board will read in the host's open boards. */
  public readonly openBoardPreview = input('');
  public readonly groupsAllowed = input(false);
  public readonly groups = input<GameGroup[]>([]);
  public readonly groupId = input<string | null>(null);
  /** A schedule game is picked, so Auto-lock and draw applies. */
  public readonly gamePicked = input(false);
  public readonly autoManageAllowed = input(false);
  public readonly autoManage = input(false);
  public readonly autoRunText = input('');
  public readonly openBoardsChanged = output<boolean>();
  public readonly groupChanged = output<GroupChoice>();
  public readonly autoManageChanged = output<boolean>();
  protected readonly groupedHint = GROUPED_SHOWN_HINT;
}
