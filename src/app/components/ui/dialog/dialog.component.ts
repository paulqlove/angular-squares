import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
        <p class="text-default" [innerHTML]="sanitizedMessage"></p>
        <div class="flex justify-end gap-2">
          <button 
            (click)="onCancel.emit()"
            class="px-4 py-2 text-sm font-medium text-default bg-control hover:bg-control-hover rounded-lg"
          >
            Cancel
          </button>
          <button 
            (click)="onConfirm.emit()"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            Continue to Venmo
          </button>
        </div>
      </div>
    </div>
  `
})
export class DialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  constructor(private sanitizer: DomSanitizer) {}

  get sanitizedMessage(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.message);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.onCancel.emit();
    }
  }
} 