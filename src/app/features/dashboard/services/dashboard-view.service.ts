import { Injectable, computed, inject, signal } from '@angular/core';

import { CardView, activeCardView, cardGridClass } from './dashboard-filters';
import { DashboardStore } from './dashboard.store';

const CARD_VIEW_KEY = 'qs-card-view';

/** The card view this device last chose; Grid until one is chosen. */
function readCardView(): CardView {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(CARD_VIEW_KEY) === 'compact' ? 'compact' : 'grid';
  } catch {
    return 'grid';
  }
}

/** Grid or Compact cards on the dashboard. Remembered on this device. Provided on the dashboard. */
@Injectable()
export class DashboardViewService {
  /** Grid / Compact is a hosting tool: players who don't host games always see Grid. */
  public readonly activeCardView = computed<CardView>(() => activeCardView(this.store.canCreateGame(), this.cardView()));
  /** Board columns: two or three tall cards in Grid; as many 19rem rows as fit in Compact. */
  public readonly cardGridClass = computed<string>(() => cardGridClass(this.activeCardView()));
  /** Grid shows the tall cards from 640px up, as before; Compact shows every board as a short row. Remembered on this device. */
  public readonly cardView = signal<CardView>(readCardView());
  public readonly cardViews: ReadonlyArray<{ id: CardView; label: string; icon: string }> = [
    { id: 'grid', label: 'Grid', icon: 'heroSquares2x2' },
    { id: 'compact', label: 'Compact', icon: 'heroBars3' },
  ];

  public setCardView(view: CardView): void {
    if (view === this.cardView()) return;
    this.cardView.set(view);
    this.fadeInCards();
    try {
      localStorage.setItem(CARD_VIEW_KEY, view);
    } catch {
      // Storage blocked: the choice lasts until the page reloads
    }
  }

  private readonly store: DashboardStore = inject(DashboardStore);

  /** Switching card view: the cards fade in over 160ms with no movement (none under reduced motion). */
  private fadeInCards(): void {
    if (typeof document === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll<HTMLElement>('[data-card-grid]').forEach(el =>
      el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.2,.7,.2,1)' }));
  }
}
