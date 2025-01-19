import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password-dialog.component.html'
})
export class PasswordDialogComponent {
  @Output() passwordSubmit = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  isOpen = false;
  password = '';

  open(): void {
    this.isOpen = true;
    this.password = '';
    // Focus the input after a short delay to ensure the dialog is rendered
    setTimeout(() => {
      const input = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  close(): void {
    this.isOpen = false;
  }

  onSubmit(): void {
    this.passwordSubmit.emit(this.password);
    this.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }
} 