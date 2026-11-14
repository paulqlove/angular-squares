import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark } from '@ng-icons/heroicons/outline';

import { DropdownComponent, DropdownOption } from '../../../../components/ui/dropdown/dropdown.component';
import { PlayersViewService } from '../../services/players-view.service';
import { PlayerCardComponent } from './player-card.component';
import { PlayerGamesComponent } from './player-games.component';

/** First-load stagger: 30ms between cards, for the first eight, then the flag drops once they're in. */
const STAGGER_CARDS = 8;
const STAGGER_MS = 30;
const STAGGER_DONE_MS = 500;

/**
 * The Players view (Season Pass): find a player, narrow to one game, then the players in two groups, Unconfirmed and
 * Confirmed: a card per player, opening into a full-width panel of their games. Sits in the Hosting section in place
 * of the boards (`<div appPlayersView>`).
 */
@Component({
  selector: 'div[appPlayersView]',
  imports: [DropdownComponent, NgIconComponent, PlayerCardComponent, PlayerGamesComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark })],
  templateUrl: './players-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .qs-tile-key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
    /* Phones: the Find a player row sticks to the top, edge to edge, over the cards (page colour at 92% on a 12px blur).
       The line under it fades in once it's stuck. */
    @media (max-width: 639.98px) {
      .qs-find-row {
        position: sticky; top: 0; z-index: 20; margin-inline: -1rem; padding-inline: 1rem;
        background: color-mix(in srgb, var(--qs-bg) 92%, transparent);
        -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
        box-shadow: 0 1px 0 transparent;
        transition: box-shadow var(--qs-t-state) var(--qs-ease);
      }
      .qs-find-row-stuck { box-shadow: 0 1px 0 var(--qs-line); }
    }
  `]
})
export class PlayersViewComponent {
  constructor() {
    // The stagger is for the first cards on screen only: once they've had time to arrive, cards come in together.
    effect(() => {
      if (this.groups().length && this.loading()) setTimeout(() => this.loading.set(false), STAGGER_DONE_MS);
    });
    // The row counts as stuck once the spot just above it has scrolled off the top.
    afterNextRender(() => {
      const sentinel = this.findSentinel()?.nativeElement;
      if (!sentinel || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(([entry]) => this.stuck.set(!entry.isIntersecting && entry.boundingClientRect.top < 0));
      observer.observe(sentinel);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** One tile column per board the list covers. */
  public readonly boardIds = computed<string[]>(() => this.players.shownBoards().map(board => board.id as string));
  /** "All 10 games", then each game, for the game picker. */
  public readonly gameOptions = computed<DropdownOption[]>(() => [
    { value: '', label: `All ${this.players.boards().length} games` },
    ...this.players.boards().map(board => ({ value: board.id as string, label: board.name }))
  ]);
  public readonly groups = computed(() => [
    { key: 'unconfirmed', label: 'Unconfirmed', players: this.players.unconfirmed() },
    { key: 'confirmed', label: 'Confirmed', players: this.players.confirmed() }
  ].filter(group => group.players.length));

  /** True until the first cards have arrived. */
  protected readonly loading = signal<boolean>(true);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  /** The Find a player row is stuck to the top (phones). */
  protected readonly stuck = signal<boolean>(false);

  /**
   * On first load, each of the first eight cards arrives 30ms after the one before, and any after them arrive with the
   * eighth, so it's done in about a quarter second.
   */
  protected enterDelay(group: number, index: number): string | null {
    if (!this.loading()) return null;
    const place = this.groups().slice(0, group).reduce((sum, g) => sum + g.players.length, 0) + index;
    return place > 0 ? `${Math.min(place, STAGGER_CARDS - 1) * STAGGER_MS}ms` : null;
  }

  protected searchFor(event: Event): void {
    this.players.search.set((event.target as HTMLInputElement).value);
  }

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly findSentinel = viewChild<ElementRef<HTMLElement>>('findSentinel');
}
