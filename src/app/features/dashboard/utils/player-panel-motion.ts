/**
 * Decisions behind a Players card's games panel on a phone (docs/DESIGN.md, Players): where the panel sits in the
 * two-column grid, and how far to scroll once it has opened so it isn't left under the bottom bar.
 */

/** Phone cards sit two to a row. */
const PHONE_COLUMNS = 2;

/** A vertical span on screen, in px from the top of the viewport. */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * The index of the card the phone panel follows: the last card in the open card's row, so the panel opens right under
 * that row. Cards in one row share one slot, so switching between them keeps the same panel. -1 when no card is open.
 */
export function phonePanelSlot(openIndex: number, count: number): number {
  if (openIndex < 0 || openIndex >= count) return -1;
  const rowEnd = Math.floor(openIndex / PHONE_COLUMNS) * PHONE_COLUMNS + PHONE_COLUMNS - 1;
  return Math.min(rowEnd, count - 1);
}

/**
 * How far to scroll, in px (positive is down), to bring an opened panel into the visible part of the screen, the way
 * scrollIntoView's block 'nearest' would: 0 when it is already in view. When it is taller than the visible part, its
 * top lines up with the top instead.
 */
export function revealScroll(panel: Span, visible: Span): number {
  if (panel.top >= visible.top && panel.bottom <= visible.bottom) return 0;
  if (panel.top < visible.top) return panel.top - visible.top;
  return Math.min(panel.bottom - visible.bottom, panel.top - visible.top);
}
