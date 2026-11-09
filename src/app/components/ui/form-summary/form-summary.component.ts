import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export interface SummaryRow {
  label: string;
  value: string;
}

/** The bottom of a settings form: what the choices above add up to, in one quiet block. Shows nothing when there are no rows. */
@Component({
  selector: 'app-form-summary',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (rows.length) {
      <section aria-label="Summary">
        <h4 class="qs-label mb-1.5 text-qs-ink">Summary</h4>
        <dl class="divide-y divide-qs-line overflow-hidden rounded-inner border border-qs-line bg-qs-panel-2">
          @for (row of rows; track row.label) {
            <div class="px-3 py-2">
              <dt class="qs-label text-[10px] text-qs-muted">{{ row.label }}</dt>
              <dd class="mt-0.5 break-words font-mono text-xs text-qs-ink">{{ row.value }}</dd>
            </div>
          }
        </dl>
      </section>
    }
  `
})
export class FormSummaryComponent {
  @Input() rows: SummaryRow[] = [];
}
