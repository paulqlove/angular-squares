import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';

/**
 * Edit game's Numbers row on the game page, phones only: the phone host bar has no Clear or Draw numbers, so
 * clearing and redrawing happen here. Projected into the Edit game popup, which the dashboard also uses without it.
 */
@Component({
  selector: 'section[appEditGameNumbers]',
  host: { class: 'flex flex-col gap-5 sm:hidden' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h4 class="qs-eyebrow qs-eyebrow-bar !flex border-b border-qs-line pb-2.5 text-[13px] font-semibold text-qs-ink">Numbers</h4>
    <p class="-mt-2 text-xs text-qs-muted">{{ hint }}</p>
    <div class="grid grid-cols-2 gap-3">
      <button type="button" (click)="host.randomizeNumbers()" [disabled]="!state.isRandomized" class="qs-btn qs-btn-secondary px-2">Clear numbers</button>
      <button type="button" (click)="host.randomizeNumbers()" [disabled]="!state.isLocked || state.isRandomized" class="qs-btn qs-btn-secondary px-2">Draw numbers</button>
    </div>
  `
})
export class EditGameNumbersComponent {
  // Protected properties

  protected readonly host: HostActionsService = inject(HostActionsService);
  protected readonly state: GameStateService = inject(GameStateService);

  protected get hint(): string {
    if (this.state.isRandomized) return 'Drawn when you locked. Clear them to redraw.';
    return this.state.isLocked ? 'Not drawn yet.' : 'Locking the board draws the numbers.';
  }
}
