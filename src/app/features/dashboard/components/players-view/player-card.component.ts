import { DOCUMENT } from '@angular/common';
import { afterEveryRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PHONE_QUERY } from '../../../../shared/media-queries';
import { PlayerSummary, WIDE_PANEL_GAMES } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';
import { PlayerGamesComponent } from './player-games.component';
import { PlayerTilesComponent } from './player-tiles.component';

/**
 * One player in the Players view: a card with the name, total points and an arrow, plus "+2 new squares",
 * "Same name, account 2" or "also Sammy" when they apply. From 640px up it adds squares and a tile per game.
 * Clicking it opens their games (`<article appPlayerCard>`); an open card gets an ink border. From 640px the games
 * float in a panel over the cards below it, so nothing on the page moves, and it closes on a click outside, Esc or the
 * card itself. The panel drops in like the Your games popover; opened straight from another card it fades in place of
 * that card's panel (styles.scss, Players card panel). When their last game is confirmed it shows "All confirmed" for a
 * beat, then fades and drops into Confirmed.
 */
@Component({
  selector: 'article[appPlayerCard]',
  imports: [NgIconComponent, PlayerGamesComponent, PlayerTilesComponent],
  host: {
    class: 'qs-card relative block cursor-pointer p-3.5 sm:p-4 has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-focus',
    '[class.qs-card-open]': 'isOpen()',
    '[class.qs-card-leave]': '!!beat()?.leaving',
    '[class.qs-card-switch]': 'players.panelSwitch()',
    '(click)': 'onClick($event)'
  },
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host.qs-card-open { z-index: 10; border-color: var(--qs-ink); box-shadow: inset 0 0 0 0.5px var(--qs-ink); }
    /* The arrow turns with the panel, both ways, over 200ms on a phone. From 640px the arrow turns in 150ms open and
       120ms close, and the border eases to ink and back over 120ms, with the popover's curves. */
    .qs-card-arrow { transition: transform var(--qs-t-state) var(--qs-ease); }
    .qs-card-arrow-open { transform: rotate(180deg); }
    @media (min-width: 640px) {
      :host { transition: border-color var(--qs-t-fast) var(--qs-ease-exit), box-shadow var(--qs-t-fast) var(--qs-ease-exit); }
      .qs-card-arrow { transition: transform var(--qs-t-fast) var(--qs-ease-exit); }
      :host.qs-card-open { transition-timing-function: var(--qs-ease-decel); }
      .qs-card-arrow-open { transition-duration: var(--qs-t-menu); transition-timing-function: var(--qs-ease-decel); }
    }
    /* The panel: 8px under the card, edge to edge with it, or two cards and the grid's 12px gap wide from four games.
       Offsets are from the card's padding box, inside its 1px border. It drops from its notch. */
    .qs-panel {
      position: absolute; top: calc(100% + 9px); left: -1px; right: -1px; cursor: auto;
      border-color: var(--qs-line-strong); box-shadow: var(--qs-shadow-pop); transform-origin: calc(100% - 27px) 0;
    }
    .qs-panel-wide { width: calc(200% + 4px + 0.75rem); left: auto; }
    .qs-panel-wide.qs-panel-grow-right { left: -1px; right: auto; transform-origin: calc(50% - 33px) 0; }
    /* The notch, centred under the arrow: 27px in from the card's right edge, or a card and a gap further in when the panel grows right */
    .qs-panel::before {
      content: ''; position: absolute; top: -6px; right: 21px; width: 10px; height: 10px; transform: rotate(45deg);
      background: var(--qs-panel); border-top: 1px solid var(--qs-line-strong); border-left: 1px solid var(--qs-line-strong);
    }
    .qs-panel-wide.qs-panel-grow-right::before { right: calc(50% + 28px); }
  `]
})
export class PlayerCardComponent {
  constructor() {
    // While open from 640px, a click outside or Esc closes it. Clicks are caught on the way down, so one that a tile
    // stops still closes it, and the click that opened the card has already passed.
    effect(onCleanup => {
      if (!this.isOpen() || typeof window === 'undefined') return;
      const phone = window.matchMedia(PHONE_QUERY);
      // The close waits for the click to finish, so a click on another card opens that card straight from this one
      // (its panel swaps in) and this one is no longer open by then.
      const close = (event: Event) => {
        if (phone.matches || !this.isOpen() || this.host.nativeElement.contains(event.target as Node)) return;
        setTimeout(() => { if (this.isOpen()) this.players.toggleOpen(this.player().key); });
      };
      const onEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || phone.matches || !this.isOpen()) return;
        const hadFocus = this.host.nativeElement.contains(this.document.activeElement);
        this.players.toggleOpen(this.player().key);
        if (hadFocus) this.toggle()?.nativeElement.focus();
      };
      this.document.addEventListener('click', close, true);
      this.document.addEventListener('keydown', onEscape);
      onCleanup(() => {
        this.document.removeEventListener('click', close, true);
        this.document.removeEventListener('keydown', onEscape);
      });
    });
    // Which way a wide panel grows, measured after each render while it is open, so it follows the card when cards
    // ahead of it come or go, and when a resize changes the columns.
    afterEveryRender({
      read: () => {
        if (this.isOpen() && this.wide() && !window.matchMedia(PHONE_QUERY).matches) this.growsRight.set(firstInRow(this.host.nativeElement));
      }
    });
  }

  /** This card's "All confirmed" beat, when its last game was just confirmed. */
  public readonly beat = computed(() => this.players.allConfirmed()?.key === this.player().key ? this.players.allConfirmed() : null);
  public readonly boardIds = input.required<string[]>();
  public readonly isOpen = computed<boolean>(() => this.players.openKey() === this.player().key);
  public readonly player = input.required<PlayerSummary>();
  /** From four games the panel is two cards wide. */
  public readonly wide = computed<boolean>(() => this.player().games.length >= WIDE_PANEL_GAMES);

  /** A wide panel grows right from the first card in a row, which has no room on its left; otherwise it grows left. */
  protected readonly growsRight = signal<boolean>(false);
  protected readonly players: PlayersViewService = inject(PlayersViewService);

  /** The card toggles itself; clicks inside its floating panel are the panel's own. */
  protected onClick(event: Event): void {
    if ((event.target as Element | null)?.closest?.('.qs-panel')) return;
    this.players.toggleOpen(this.player().key);
  }

  private readonly document: Document = inject(DOCUMENT);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');
}

/** The card is the first in its grid row. */
function firstInRow(card: HTMLElement): boolean {
  const grid = card.parentElement;
  return !grid || card.getBoundingClientRect().left - grid.getBoundingClientRect().left < 1;
}
