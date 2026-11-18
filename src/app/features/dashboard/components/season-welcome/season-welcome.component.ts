import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroXMark } from '@ng-icons/heroicons/outline';

import { PlanService } from '../../../../core/services/plan.service';
import { SeasonWelcomeService } from '../../../../core/services/season-welcome.service';
import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';

/**
 * The one-time welcome a Season Pass host sees at the top of the dashboard, after checkout: what the pass gives,
 * three steps and Create a board. The x closes it for good (SeasonWelcomeService). Sits on `<section appSeasonWelcome>`.
 */
@Component({
  selector: 'section[appSeasonWelcome]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroPlus, heroXMark })],
  host: { class: 'qs-card relative block p-5 sm:p-6', 'aria-labelledby': 'season-welcome-title' },
  template: `
    <button type="button" (click)="welcome.dismiss()" class="qs-btn qs-btn-ghost absolute right-2 top-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
      <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
    </button>
    <h2 id="season-welcome-title" class="qs-title pr-10 text-2xl sm:text-3xl">You're a Season Pass host</h2>
    <p class="mt-2 text-qs-muted">{{ summary() }}</p>
    <ol class="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:gap-x-10">
      @for (step of steps; track $index) {
        <li class="flex items-baseline gap-3"><span class="font-mono font-semibold text-qs-ink">{{ $index + 1 }}</span><span>{{ step }}</span></li>
      }
    </ol>
    <button type="button" (click)="dialogs.openCreateModal($event)" [disabled]="dialogs.isCheckingBoardLimit()" [attr.aria-busy]="dialogs.isCheckingBoardLimit()"
      class="qs-btn qs-btn-primary mt-6 w-full disabled:cursor-wait sm:w-auto">
      <ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon><span class="-mr-[0.1em] indent-0">Create a board</span>
    </button>
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

  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly steps: readonly string[] = ['Create a board', 'Share the link', 'Lock to draw numbers'];
  protected readonly welcome: SeasonWelcomeService = inject(SeasonWelcomeService);

  private readonly planService: PlanService = inject(PlanService);
}
