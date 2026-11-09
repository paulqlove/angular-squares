import { ChangeDetectionStrategy, Component, ElementRef, effect, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

/** Mounted once in the app root. Opened through ConfirmService.ask(). */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (confirm.pending(); as ask) {
      <div animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 z-[170] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" (click)="confirm.answer(false)">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          class="w-full max-w-sm rounded-t-card border border-qs-line bg-qs-panel p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-pop sm:rounded-card sm:pb-6"
          (keydown.escape)="$event.stopPropagation(); confirm.answer(false)"
          (keydown.tab)="trapTab($event, false)"
          (keydown.shift.tab)="trapTab($event, true)"
          (click)="$event.stopPropagation()"
        >
          <h3 id="confirm-title" class="qs-title text-2xl">{{ ask.title }}</h3>
          <p id="confirm-message" class="mt-3 text-qs-muted">{{ ask.message }}</p>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="qs-btn qs-btn-secondary" (click)="confirm.answer(false)">Cancel</button>
            <button type="button" class="qs-btn qs-btn-danger" (click)="confirm.answer(true)">{{ ask.confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  protected confirm = inject(ConfirmService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') return;
      if (this.confirm.pending()) {
        this.returnFocus = document.activeElement as HTMLElement | null;
        // Cancel first: the safe choice is the default
        setTimeout(() => this.focusables()[0]?.focus());
      } else {
        const target = this.returnFocus;
        this.returnFocus = null;
        setTimeout(() => target?.isConnected && target.focus());
      }
    });
  }

  trapTab(event: Event, back: boolean): void {
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (back && active === first) { event.preventDefault(); last.focus(); }
    else if (!back && active === last) { event.preventDefault(); first.focus(); }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('button')).filter(e => e.offsetParent !== null);
  }
}
