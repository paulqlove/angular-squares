import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, computed, effect, inject, untracked } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { captureLayout, glideToNewLayout } from '../../utils/flip-layout';
import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardViewService } from '../../services/dashboard-view.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { ValueSwapComponent } from '../../../../components/ui/value-swap/value-swap.component';
import { DashboardViewToggleComponent } from '../dashboard-view-toggle/dashboard-view-toggle.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { PlayersViewComponent } from '../players-view/players-view.component';

/**
 * The boards you host, grouped by what you do next: Ready to lock, Filling, Locked.
 * Sits on its section (`<section appDashboardHosting>`), with the Grid / Compact toggle in its heading.
 * Season Pass hosts with two or more boards also get a Boards | Players switch there, which swaps in the Players view.
 */
@Component({
  selector: 'section[appDashboardHosting]',
  imports: [NgIconComponent, DashboardViewToggleComponent, GameCardComponent, PlayersViewComponent, ValueSwapComponent],
  templateUrl: './dashboard-hosting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    /* Boards | Players: a two-button switch, ink fill on the one showing. */
    .qs-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--qs-r-btn); background: var(--qs-panel-2); border: 1px solid var(--qs-line); }
    .qs-seg button { height: 40px; padding: 0 14px; border-radius: 6px; font-family: var(--qs-font-mono); font-size: 13px; font-weight: 500;
      letter-spacing: .1em; text-transform: uppercase; color: var(--qs-muted); transition: background-color var(--qs-t-fast) var(--qs-ease), color var(--qs-t-fast) var(--qs-ease); }
    @media (hover: hover) { .qs-seg button:hover:not([aria-pressed="true"]) { color: var(--qs-ink); } }
    .qs-seg button[aria-pressed="true"] { background: var(--qs-ink); color: var(--qs-bg); }
  `]
})
export class DashboardHostingComponent {
  constructor() {
    // A board locked from its card glides to Locked and the cards around it reflow, instead of jumping.
    // A component effect runs before this template refreshes, so the old layout is still on screen to measure.
    effect(() => {
      this.store.boardGroups();
      const moved = untracked(this.store.justLocked);
      if (!moved.size || !isPlatformBrowser(this.platformId) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const host = this.host.nativeElement;
      const before = captureLayout(document, moved, host);
      afterNextRender(() => glideToNewLayout(document, before, moved), { injector: this.injector });
    });
  }

  /** "10 games", or "3 of 10 games" while the search narrows the list. The Players view counts co-hosted boards too. */
  public readonly countLabel = computed<string>(() => {
    if (this.players.active()) return `${this.players.boards().length} games`;
    const all = this.store.myGames().length;
    const shown = this.store.visibleMyGames().length;
    return `${shown === all ? all : shown + ' of ' + all} ${all === 1 ? 'game' : 'games'}`;
  });
  /** Three placeholder cards while the boards load. */
  public readonly skeletons: ReadonlyArray<number> = [0, 1, 2];

  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
  protected readonly view: DashboardViewService = inject(DashboardViewService);

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector: Injector = inject(Injector);
  private readonly platformId: object = inject(PLATFORM_ID);
}
