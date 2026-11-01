import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';


export interface DialogPart {
  text: string;
  bold?: boolean;
  color?: string;
}

@Component({
    selector: 'app-dialog',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
        >
        <div class="bg-card rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
          <h2 class="text-lg font-semibold text-heading">{{ title }}</h2>
          <p class="text-default">
            @for (part of messageParts; track part) {
              @if (part.bold) {
                <strong [style.color]="part.color">{{ part.text }}</strong>
              }
              @if (!part.bold) {
                <span>{{ part.text }}</span>
              }
            }
          </p>
          <div class="flex justify-end gap-2">
            <button
              (click)="onCancel.emit()"
              class="px-4 py-2 text-muted hover:text-default"
              >
              Cancel
            </button>
            <button
              (click)="onConfirm.emit()"
            class="px-4 py-2 rounded shadow-md hover:shadow-lg transition-all duration-200
                   bg-qs-accent
                   hover:bg-qs-accent-hover
                   text-white"
              >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
    `
})
export class DialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() messageParts: DialogPart[] = [];
  @Input() confirmText = 'Continue';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.onCancel.emit();
    }
  }
}
