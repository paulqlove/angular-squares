import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
      (dismissed)="confirm.answer(false)"
    >
      @if (confirm.pending(); as ask) {
        <div class="p-6">
          <h3 id="confirm-title" class="qs-title text-2xl">{{ ask.title }}</h3>
          <p id="confirm-message" class="mt-3 text-qs-muted">{{ ask.message }}</p>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="qs-btn qs-btn-secondary" data-autofocus (click)="confirm.answer(false)">Cancel</button>
            <button type="button" class="qs-btn qs-btn-danger" (click)="confirm.answer(true)">{{ ask.confirmLabel }}</button>
          </div>
        </div>
      }
    </app-modal>
  `
})
export class ConfirmDialogComponent {
  protected confirm = inject(ConfirmService);
}
