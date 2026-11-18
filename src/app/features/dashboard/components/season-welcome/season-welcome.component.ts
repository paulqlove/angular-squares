import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCalendarDays, heroChartPie, heroLockClosed, heroSquares2x2, heroTv, heroUsers, heroXMark } from '@ng-icons/heroicons/outline';

import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { PlanService } from '../../../../core/services/plan.service';
import { SeasonWelcomeService } from '../../../../core/services/season-welcome.service';
import { PassPerk, SEASON_PASS_PERKS } from '../../../../core/utils/season-pass';
import { DEMO_PLAYERS } from '../../../../shared/demo-players';

/** One square of the perks board: the perk, its icon and a player color, like a claimed square. */
interface PerkSquare extends PassPerk {
  color: string;
  icon: string;
}

/** An icon for each perk. */
const PERK_ICONS: Readonly<Record<PassPerk['id'], string>> = {
  autoManage: 'heroLockClosed',
  boards: 'heroSquares2x2',
  customSplits: 'heroChartPie',
  groups: 'heroUsers',
  liveScores: 'heroTv',
  openBoards: 'heroSquares2x2',
  seasonLimit: 'heroCalendarDays'
};

/**
 * The one-time welcome a Season Pass host gets on the dashboard, after checkout: a dialog with how long the pass
 * runs, then what it unlocks as squares on a small board (the dark board frame, squares in the players' colors), from
 * the same perk list as the upgrade dialog. "Let's go", the x, Esc and a backdrop tap all close it for good
 * (SeasonWelcomeService).
 */
@Component({
  selector: 'app-season-welcome',
  imports: [ModalComponent, NgIconComponent],
  providers: [provideIcons({ heroCalendarDays, heroChartPie, heroLockClosed, heroSquares2x2, heroTv, heroUsers, heroXMark })],
  template: `
    <app-modal [open]="welcome.shows()" labelledBy="season-welcome-title" describedBy="season-welcome-summary" phone="center" extraClass="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 text-qs-ink sm:p-7" (dismissed)="welcome.dismiss()">
      <div class="flex items-start justify-between gap-3">
        <p class="qs-eyebrow qs-eyebrow-bar">Season Pass</p>
        <button type="button" (click)="welcome.dismiss()" aria-label="Close"
          class="-mr-2 -mt-2 ml-auto inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn text-qs-muted hover:bg-qs-panel-2 hover:text-qs-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent">
          <ng-icon name="heroXMark" class="text-xl" aria-hidden="true"></ng-icon>
        </button>
      </div>
      <!-- Focus starts on the title: the dialog opens on page load, so a focused x would show its ring before any tap -->
      <h2 id="season-welcome-title" tabindex="-1" data-autofocus class="qs-title mt-3 text-3xl focus-visible:outline-none sm:text-4xl">You're a Season Pass <span class="text-qs-accent">host</span></h2>
      <p id="season-welcome-summary" class="mt-4 text-base text-qs-muted">{{ summary() }}</p>
      <ul class="mt-5 grid grid-cols-2 gap-1 rounded-card bg-qs-tile p-2.5 sm:grid-cols-3 sm:gap-1.5 sm:p-3" aria-label="Included">
        @for (perk of squares; track perk.id) {
          <li class="flex aspect-[5/4] flex-col justify-between rounded-[3px] p-2.5 text-qs-tile sm:aspect-square" [class]="perk.color">
            <ng-icon [name]="perk.icon" class="text-lg" aria-hidden="true"></ng-icon>
            <span class="text-sm font-semibold leading-tight">{{ perk.label }}</span>
          </li>
        }
      </ul>
      <button type="button" class="qs-btn qs-btn-primary mt-6 w-full" (click)="welcome.dismiss()">Let's go</button>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonWelcomeComponent {
  /** "Good through June 30. Up to 25 games at a time." A pass that never ends drops the first sentence. */
  public readonly summary = computed<string>(() => {
    const lastDay = this.planService.passLastDay();
    const limit = `Up to ${this.planService.features().activeBoards} games at a time.`;
    return lastDay ? `Good through ${lastDay}. ${limit}` : limit;
  });

  /** The dialog's perks, less the board cap the line above already says, each in the next player's color. */
  protected readonly squares: readonly PerkSquare[] = SEASON_PASS_PERKS
    .filter(perk => perk.id !== 'boards')
    .map((perk, i) => ({ ...perk, color: DEMO_PLAYERS[i % DEMO_PLAYERS.length].color, icon: PERK_ICONS[perk.id] }));
  protected readonly welcome: SeasonWelcomeService = inject(SeasonWelcomeService);

  private readonly planService: PlanService = inject(PlanService);
}
