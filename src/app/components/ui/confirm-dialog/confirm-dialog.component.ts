import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ModalComponent } from '../modal/modal.component';

/** Mounted once in the app root. Opened through ConfirmService.ask(). */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-modal
      [open]="!!confirm.pending()"
      labelledBy="confirm-title"
      describedBy="confirm-message"
      role="alertdialog"
      size="sm"
      [level]="3"
      (dismissed)="no()"
    >
      @if (confirm.pending(); as ask) {
        <div class="p-6">
          <h3 id="confirm-title" class="qs-title text-2xl">{{ ask.title }}</h3>
          <p id="confirm-message" class="mt-3 text-qs-muted">{{ ask.message }}</p>
          @if (ask.rememberKey) {
            <label class="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-qs-ink">
              <input type="checkbox" class="h-4 w-4 shrink-0 accent-[var(--qs-accent)]" [checked]="never()" (change)="never.set($any($event.target).checked)" />
              Never show me this again
            </label>
          }
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button type="button" class="qs-btn qs-btn-secondary" data-autofocus (click)="no()">Cancel</button>
            <button type="button" class="qs-btn" [class]="ask.tone === 'primary' ? 'qs-btn-primary' : 'qs-btn-danger'" (click)="yes()">{{ ask.confirmLabel }}</button>
          </div>
        </div>
      }
    </app-modal>
  `
})
export class ConfirmDialogComponent {
  protected confirm = inject(ConfirmService);
  protected never = signal(false);

  protected no(): void {
    this.never.set(false);
    this.confirm.answer(false);
  }

  protected yes(): void {
    const remember = this.never();
    this.never.set(false);
    this.confirm.answer(true, remember);
  }
}
