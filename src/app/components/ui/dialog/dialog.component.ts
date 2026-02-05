import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DialogPart {
  text: string;
  bold?: boolean;
  color?: string;
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <div class="bg-card rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 class="text-lg font-semibold text-heading">{{ title }}</h2>
        <p class="text-default">
          <ng-container *ngFor="let part of messageParts">
            <strong *ngIf="part.bold" [style.color]="part.color">{{ part.text }}</strong>
            <span *ngIf="!part.bold">{{ part.text }}</span>
          </ng-container>
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
                   bg-gradient-to-r from-secondary-500 via-secondary-600 to-accent-600
                   hover:from-secondary-600 hover:via-secondary-700 hover:to-accent-700
                   text-white"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
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
