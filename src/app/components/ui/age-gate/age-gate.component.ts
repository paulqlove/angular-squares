import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-age-gate',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex items-start gap-3">
      <input
        [id]="inputId"
        type="checkbox"
        class="mt-0.5 h-5 w-5 shrink-0 rounded border-default accent-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        [ngModel]="checked"
        (ngModelChange)="checkedChange.emit($event)"
      />
      <label [attr.for]="inputId" class="text-sm leading-snug text-default">
        I confirm I am 18 or older and agree to the
        <a
          routerLink="/terms"
          target="_blank"
          rel="noopener"
          class="underline font-medium text-emerald-800 dark:text-emerald-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >Terms of Service</a>.
      </label>
    </div>
  `
})
export class AgeGateComponent {
  @Input() checked = false;
  @Input() inputId = 'age-confirm';
  @Output() checkedChange = new EventEmitter<boolean>();
}
