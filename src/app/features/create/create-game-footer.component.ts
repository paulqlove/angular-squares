import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Create game's button row: Cancel or Back, Create from an early step, and Next or the final Create.
 * Next and the final Create submit the form, so the form decides what Enter does.
 */
@Component({
  selector: 'app-create-game-footer',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="flex items-center gap-2 border-t border-qs-line px-4 py-3 sm:px-6">
  @if (firstStep()) {
    <button type="button" (click)="cancelled.emit()" class="qs-btn qs-btn-ghost px-3 text-qs-muted">Cancel</button>
  } @else {
    <button type="button" (click)="back.emit()" class="qs-btn qs-btn-ghost px-3 text-qs-muted">Back</button>
  }
  <div class="ml-auto flex items-center gap-2">
    @if (!lastStep()) {
      @if (canCreate()) {
        <button type="button" (click)="createNow.emit()" [disabled]="isCreating()" class="qs-btn qs-btn-secondary px-4 disabled:opacity-45">Create</button>
      }
      <button type="submit" [disabled]="nextDisabled()" class="qs-btn qs-btn-primary px-4 disabled:opacity-45">Next</button>
    } @else {
      <button type="submit" [disabled]="isCreating() || !nameGiven()" [attr.aria-busy]="isCreating()" class="qs-btn qs-btn-primary min-w-28 disabled:opacity-45 sm:min-w-40">
        @if (isCreating()) {
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Creating
        } @else {
          Create
        }
      </button>
    }
  </div>
</div>
`
})
export class CreateGameFooterComponent {
  public readonly firstStep = input(false);
  public readonly lastStep = input(false);
  /** Create shows on the early steps once the board has a name and a valid split. */
  public readonly canCreate = input(false);
  public readonly isCreating = input(false);
  public readonly nextDisabled = input(false);
  public readonly nameGiven = input(false);
  public readonly cancelled = output<void>();
  public readonly back = output<void>();
  public readonly createNow = output<void>();
}
