import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

import { PlanService } from '../../../../core/services/plan.service';
import { SeasonWelcomeService } from '../../../../core/services/season-welcome.service';
import { PassPerk, SEASON_PASS_PERKS } from '../../../../core/utils/season-pass';

/**
 * The one-time welcome a Season Pass host sees at the top of the dashboard, after checkout: how long the pass runs and
 * what it unlocks, from the same perk list as the upgrade dialog. No button; the x closes it for good
 * (SeasonWelcomeService). Sits on `<section appSeasonWelcome>`.
 */
@Component({
  selector: 'section[appSeasonWelcome]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroXMark })],
  host: { class: 'qs-card relative block p-5 sm:p-6', 'aria-labelledby': 'season-welcome-title' },
  template: `
    <button type="button" (click)="welcome.dismiss()" class="qs-btn qs-btn-ghost absolute right-2 top-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
      <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
    </button>
    <h2 id="season-welcome-title" class="qs-title pr-10 text-2xl sm:text-3xl">You're a Season Pass host</h2>
    <p class="mt-2 text-qs-muted">{{ summary() }}</p>
    <ul class="mt-4 flex flex-wrap gap-2" aria-label="Included">
      @for (perk of perks; track perk.id) {
        <li class="qs-badge qs-badge-ok">{{ perk.label }}</li>
      }
    </ul>
  `,
  styles: [':host(.qs-welcome-leave) { animation: qs-fade-out var(--qs-t-fast) var(--qs-ease-in) both; pointer-events: none; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonWelcomeComponent {
  /** "Good through June 30. Up to 25 games at a time." A pass that never ends drops the first sentence. */
  public readonly summary = computed<string>(() => {
    const lastDay = this.planService.passLastDay();
    const limit = `Up to ${this.planService.features().activeBoards} games at a time.`;
    return lastDay ? `Good through ${lastDay}. ${limit}` : limit;
  });

  /** The dialog's perks, less the board cap the line above already says. */
  protected readonly perks: readonly PassPerk[] = SEASON_PASS_PERKS.filter(perk => perk.id !== 'boards');
  protected readonly welcome: SeasonWelcomeService = inject(SeasonWelcomeService);

  private readonly planService: PlanService = inject(PlanService);
}
