import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="!disabled && onChange.emit(!checked)"
      [class]="'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 ' +
        (checked ? 'bg-primary-600' : 'bg-gray-200') +
        (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer')"
      role="switch"
      [attr.aria-checked]="checked"
      [attr.aria-disabled]="disabled"
      [disabled]="disabled"
    >
      <span
        [class]="'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ' +
          (checked ? 'translate-x-5' : 'translate-x-0')"
      ></span>
    </button>
  `
})
export class ToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Output() onChange = new EventEmitter<boolean>();
} 