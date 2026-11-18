import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';

import { GameGroup } from '../../../../core/utils/game-groups';
import {
  COHOST_EMAIL_MAX, CoHostPlan, CoHostedBoard, cleanCoHostEmail, coHostPlan, coHostPlanLines, coHostSaveLabel, looksLikeEmail
} from '../../../../core/utils/group-cohost';

/**
 * A group's co-host, typed in place in the Groups sheet (Creative's K2): the email field, and before saving,
 * which of the group's games get the co-host and which keep their own. The sheet saves it.
 */
@Component({
  selector: 'app-group-cohost-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-3 border-b border-qs-line py-4" (submit)="$event.preventDefault(); save()">
      <p class="truncate text-lg font-semibold">{{ group().name }}</p>
      <div class="flex flex-col gap-2">
        <label for="group-cohost-email" class="qs-label text-qs-muted">Co-host for {{ group().name }} games</label>
        <input
          id="group-cohost-email"
          type="email"
          class="qs-input"
          placeholder="their@email.com"
          autocomplete="off"
          enterkeyhint="done"
          data-autofocus
          [attr.maxlength]="maxEmail"
          [class.qs-input-error]="showError()"
          [attr.aria-invalid]="showError()"
          [value]="typed()"
          (input)="typed.set($any($event.target).value)"
          (keydown.escape)="$event.stopPropagation(); cancelled.emit()"
        />
        @if (showError()) {
          <p class="text-sm text-qs-bad">Enter an email address, or clear the field to remove the co-host.</p>
        } @else {
          <p class="text-sm text-qs-muted">Filled in on every new {{ group().name }} game.</p>
        }
      </div>
      @if (valid() && plan().adds.length) {
        <div class="rounded-inner bg-qs-panel-2 p-4">
          <p class="font-semibold">Add {{ email() }} to existing {{ group().name }} games?</p>
          @for (line of lines(); track line) {
            <p class="mt-1 text-sm text-qs-muted">{{ line }}</p>
          }
          <p class="mt-1 text-sm text-qs-muted">Locked and finished games are included.</p>
        </div>
      }
      <div class="flex gap-3">
        <button type="button" class="qs-btn qs-btn-ghost flex-1" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="qs-btn qs-btn-ink flex-1" [disabled]="saving()">{{ saveLabel() }}</button>
      </div>
    </form>
  `
})
export class GroupCoHostFieldComponent {
  /** The owner's games, to count the ones that get the co-host. */
  public readonly boards = input<CoHostedBoard[]>([]);
  public readonly group = input.required<GameGroup>();
  public readonly saving = input<boolean>(false);
  public readonly cancelled = output<void>();
  /** The email as typed; empty removes the group's co-host. */
  public readonly saved = output<string>();

  protected readonly email = computed<string>(() => cleanCoHostEmail(this.typed()));
  protected readonly lines = computed<string[]>(() => coHostPlanLines(this.plan(), this.email()));
  protected readonly maxEmail = COHOST_EMAIL_MAX;
  protected readonly plan = computed<CoHostPlan>(() => coHostPlan(this.boards(), this.group().id, this.email()));
  protected readonly saveLabel = computed<string>(() => this.valid() ? coHostSaveLabel(this.plan()) : 'Save');
  /** Shown only after Save, so the field doesn't complain mid-typing. */
  protected readonly showError = computed<boolean>(() => this.tried() && !!this.email() && !this.valid());
  protected readonly tried = signal<boolean>(false);
  protected readonly typed = linkedSignal<string>(() => this.group().coHost?.email ?? '');
  protected readonly valid = computed<boolean>(() => looksLikeEmail(this.email()));

  protected save(): void {
    this.tried.set(true);
    if (!this.email() || this.valid()) this.saved.emit(this.email());
  }
}
