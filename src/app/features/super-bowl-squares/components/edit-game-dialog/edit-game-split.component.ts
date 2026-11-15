import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroLockClosed } from '@ng-icons/heroicons/outline';

import { QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../../../../core/plans';
import { SPLIT_QUARTERS, SplitPercents, splitLabel, splitPresetId, splitRemaining, splitTenths } from '../../../../core/utils/split-edit';

/** Edit game's Quarter split: presets, Custom, and the running total. Locked without a Season Pass or once drawn. */
@Component({
  selector: 'app-edit-game-split',
  imports: [FormsModule, NgIconComponent],
  providers: [provideIcons({ heroLockClosed })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <span class="qs-label text-qs-muted">Quarter split</span>
      @if (!canCustomSplit() || splitLocked()) {
        <div class="flex items-center justify-between gap-3 rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2.5">
          <span class="font-mono text-sm tabular-nums text-qs-ink">{{ label() }}</span>
          <ng-icon name="heroLockClosed" class="text-base text-qs-muted"></ng-icon>
        </div>
        <p class="text-xs text-qs-muted">
          {{ !canCustomSplit() ? 'Custom splits come with the Season Pass.' : 'The split locks once numbers are drawn.' }}
        </p>
      } @else {
        <div class="flex flex-wrap gap-2" role="group" aria-label="Quarter split">
          @for (preset of presets; track preset.id) {
            <button type="button" class="qs-tab" [attr.aria-pressed]="presetId() === preset.id" (click)="applyPreset(preset.split)">{{ preset.label }}</button>
          }
          <button type="button" class="qs-tab" [attr.aria-pressed]="presetId() === 'custom'" (click)="customOpen.set(true)">Custom</button>
        </div>
        @if (customOpen() || presetId() === 'custom') {
          <div class="mt-1.5 grid grid-cols-4 gap-2">
            @for (q of quarters; track q.key) {
              <div class="flex flex-col gap-2">
                <label [for]="'split-' + q.key" class="qs-label text-xs text-qs-muted">{{ q.label }}</label>
                <input [id]="'split-' + q.key" type="number" min="0" max="100" step="0.5" [ngModel]="pct()[q.key]" (ngModelChange)="setQuarter(q.key, $event)" class="qs-input px-2 text-center tabular-nums" />
              </div>
            }
          </div>
        }
        <p class="text-xs tabular-nums" [class]="valid() ? 'text-qs-muted' : 'text-qs-bad'">
          {{ label() }} · {{ valid() ? 'Totals 100%' : 'Must total 100% (' + remaining() + ' left), one decimal at most' }}
        </p>
      }
    </div>
  `
})
export class EditGameSplitComponent {
  public readonly canCustomSplit = input<boolean>(false);
  public readonly pct = model.required<SplitPercents>();
  public readonly splitLocked = input<boolean>(false);

  protected readonly customOpen = signal<boolean>(false);
  protected readonly label = computed<string>(() => splitLabel(this.pct()));
  protected readonly presetId = computed<string>(() => splitPresetId(this.pct()));
  protected readonly presets = SPLIT_PRESETS;
  protected readonly quarters = SPLIT_QUARTERS;
  protected readonly remaining = computed<string>(() => splitRemaining(this.pct()));
  protected readonly valid = computed<boolean>(() => isValidSplit(splitTenths(this.pct())));

  protected applyPreset(split: QuarterSplit): void {
    this.pct.set({ q1: split.q1 / 10, q2: split.q2 / 10, q3: split.q3 / 10, q4: split.q4 / 10 });
    this.customOpen.set(false);
  }

  protected setQuarter(key: keyof QuarterSplit, value: number): void {
    this.pct.update(pct => ({ ...pct, [key]: value }));
  }
}
