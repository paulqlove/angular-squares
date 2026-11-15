import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, input, OnChanges, signal, SimpleChanges, viewChild } from '@angular/core';

import { PHONE_QUERY, REDUCED_MOTION_QUERY } from '../../../../shared/media-queries';
import { PlayerSummary } from '../../services/players-across-games';
import { revealScroll } from '../../utils/player-panel-motion';
import { PlayerGamesComponent } from './player-games.component';

/** The open grows over --qs-t-state; the reveal scroll waits for it. A switch eases the height over the same time. */
const OPEN_MS = 200;
const EASE_DECEL = 'cubic-bezier(.2,0,0,1)'; // --qs-ease-decel

/**
 * A Players card's games on a phone: a full-width panel under the open card's row (`<div appPlayerPanel>`), placed by
 * the Players view with animate.enter="qs-panel-open" and animate.leave="qs-panel-close". It grows from nothing over
 * 200ms and the cards below glide down; its games fade in 40ms in, rising 4px. Closing, they fade in 80ms while it
 * folds away over 160ms. Switching to the other card in the row keeps the panel: the games crossfade and only the
 * difference in height eases. Once open, if its bottom is under the bottom bar or off screen, the page scrolls it into
 * view once. The height moves on purpose here (docs/DECISIONS.md, D-029). Reduced motion: the height changes at once
 * and the games fade over 120ms.
 */
@Component({
  selector: 'div[appPlayerPanel]',
  imports: [PlayerGamesComponent],
  host: { class: 'qs-player-panel col-span-full grid sm:hidden', role: 'region', '[attr.aria-label]': "player().name + '’s games'" },
  template: `
    <div class="qs-panel-clip">
      <div class="pb-3">
        <div #stack class="qs-card relative">
          @for (shown of players(); track shown.key) {
            <div class="qs-panel-games" [class.qs-games-open]="!switched()" [class.qs-games-swap]="switched()" animate.leave="qs-games-out">
              <div appPlayerGames [player]="shown" [phone]="true"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { grid-template-rows: 1fr; }
    .qs-panel-clip { min-height: 0; }
    :host(.qs-panel-open) .qs-panel-clip, :host(.qs-panel-close) .qs-panel-clip { overflow: hidden; }
    :host(.qs-panel-open) { animation: qs-panel-grow var(--qs-t-state) var(--qs-ease-decel); }
    :host(.qs-panel-close) { animation: qs-panel-fold 160ms var(--qs-ease-in) forwards; pointer-events: none; }
    @keyframes qs-panel-grow { from { grid-template-rows: 0fr; } }
    @keyframes qs-panel-fold { to { grid-template-rows: 0fr; } }
    .qs-games-open { animation: qs-games-rise 160ms var(--qs-ease-decel) 40ms backwards; }
    .qs-games-swap { animation: qs-fade-in 160ms var(--qs-ease-decel) backwards; }
    /* The leaving games sit over the arriving ones, so the panel takes the new height and eases to it */
    .qs-games-out { position: absolute; inset: 0 0 auto; animation: qs-fade-out 80ms var(--qs-ease-exit) forwards; pointer-events: none; }
    :host(.qs-panel-close) .qs-panel-games { position: static; animation: qs-fade-out 80ms var(--qs-ease-in) forwards; }
    @keyframes qs-games-rise { from { opacity: 0; transform: translateY(4px); } }
    /* Reduced motion: the global rule cuts the grow and fold to nothing, so only the games' fade is left */
    @media (prefers-reduced-motion: reduce) {
      .qs-games-open, .qs-games-swap { animation: qs-fade-in 120ms linear backwards !important; }
      .qs-games-out { animation: qs-fade-out 120ms linear forwards !important; }
    }
  `]
})
export class PlayerPanelComponent implements OnChanges {
  constructor() {
    afterNextRender(() => {
      const timer = setTimeout(() => this.reveal(), matchMedia(REDUCED_MOTION_QUERY).matches ? 0 : OPEN_MS);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  /** The open player. */
  public readonly player = input.required<PlayerSummary>();

  /** On a switch, takes the height before the new games render, then eases from it once they have. */
  public ngOnChanges(changes: SimpleChanges): void {
    const before = changes['player']?.previousValue as PlayerSummary | undefined;
    if (!before || before.key === this.player().key) return;
    this.switched.set(true);
    const from = this.stack()?.nativeElement.offsetHeight ?? 0;
    afterNextRender(() => this.easeHeight(from), { injector: this.injector });
  }

  /** The open player's games, keyed by player so a switch crossfades the old games out and the new ones in. */
  protected readonly players = computed<PlayerSummary[]>(() => [this.player()]);
  /** The panel has switched players at least once, so new games crossfade in rather than rise. */
  protected readonly switched = signal<boolean>(false);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector: Injector = inject(Injector);
  private readonly stack = viewChild<ElementRef<HTMLElement>>('stack');

  /** Eases the panel from its old height to the new one. Skipped on wider screens, where it is hidden, and with reduced motion. */
  private easeHeight(from: number): void {
    const stack = this.stack()?.nativeElement;
    if (!stack || !matchMedia(PHONE_QUERY).matches || matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const to = stack.offsetHeight;
    if (!from || from === to) return;
    stack.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }], { duration: OPEN_MS, easing: EASE_DECEL });
  }

  /** Scrolls the opened panel into view once, above the bottom bar, unless it's already in view. */
  private reveal(): void {
    if (!matchMedia(PHONE_QUERY).matches) return;
    const bar = document.querySelector<HTMLElement>('.qs-dock:not(.qs-dock-off)');
    const visibleBottom = bar?.getBoundingClientRect().top ?? window.innerHeight;
    const panel = this.host.nativeElement.getBoundingClientRect();
    const delta = revealScroll(panel, { top: 0, bottom: Math.min(visibleBottom, window.innerHeight) });
    if (delta) window.scrollBy({ top: delta, behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth' });
  }
}
