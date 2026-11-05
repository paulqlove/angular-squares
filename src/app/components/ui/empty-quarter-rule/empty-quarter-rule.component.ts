import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { EMPTY_QUARTER_RULES, EmptyQuarterRule } from '../../../core/plans';

/** Host setting: what happens to a quarter's points when nobody holds the winning square. */
@Component({
  selector: 'app-empty-quarter-rule',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <fieldset>
      <legend class="qs-label mb-1.5 text-qs-muted">If a quarter has no winner</legend>
      <div class="space-y-2">
        @for (rule of rules; track rule.id) {
          <label
            class="flex cursor-pointer items-start gap-3 rounded-inner border p-3 transition-colors"
            [class]="value === rule.id ? 'border-qs-accent bg-qs-accent-soft' : 'border-qs-line hover:border-qs-line-strong'"
          >
            <input
              type="radio"
              class="mt-1 h-4 w-4 shrink-0 accent-[var(--qs-accent)]"
              [name]="name"
              [value]="rule.id"
              [checked]="value === rule.id"
              (change)="valueChange.emit(rule.id)"
            />
            <span class="min-w-0">
              <span class="block font-semibold text-qs-ink">{{ rule.label }}</span>
              <span class="mt-0.5 block text-xs text-qs-muted">{{ rule.description }}</span>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `
})
export class EmptyQuarterRuleComponent {
  @Input() value: EmptyQuarterRule = 'final';
  /** Radio group name; unique per form so two on one page do not share a selection. */
  @Input() name = 'empty-quarter-rule';
  @Output() valueChange = new EventEmitter<EmptyQuarterRule>();

  readonly rules = EMPTY_QUARTER_RULES;
}
