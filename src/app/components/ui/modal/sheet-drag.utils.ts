/** Swipe down to close a phone sheet: the numbers behind the gesture, with no DOM, so they can be tested directly. */

/** One pointer position in a drag: clientY and the event's timeStamp. */
export interface DragSample {
  t: number;
  y: number;
}

/** A press that travels further than this is not a tap, and the click that follows it is swallowed. */
export const TAP_SLOP_PX = 10;

/** The backdrop's strength at the close point, as a share of its resting value. */
const BACKDROP_AT_CLOSE = 0.4;
/** A drag past this share of the sheet's height closes it. */
const CLOSE_FRACTION = 0.3;
/** A downward flick faster than this closes the sheet whatever the distance, in px per ms. */
const FLICK_PX_PER_MS = 0.5;
/** Only the last stretch of movement counts toward a flick, so a slow drag that ends still doesn't fling. */
const FLICK_WINDOW_MS = 100;
/** Dragging up past the top moves the sheet this much per pixel: heavy, and no stretch. */
const UP_RESISTANCE = 0.2;

/** How strong the backdrop is, 1 at rest down to 0.4 at the close point. */
export function backdropOpacity(offset: number, height: number): number {
  const closeAt = height * CLOSE_FRACTION;
  if (offset <= 0 || closeAt <= 0) return 1;
  return 1 - (1 - BACKDROP_AT_CLOSE) * Math.min(offset / closeAt, 1);
}

/**
 * Whether a drag can start, given the scrollTop of each scrolling box between the finger and the sheet. With none
 * (the grabber or header) it starts either way; inside a box it starts only going down with every box at its top,
 * so it never fights the content's own scroll.
 */
export function canDragFrom(scrollTops: readonly number[], dy: number): boolean {
  if (!scrollTops.length) return true;
  return dy > 0 && scrollTops.every(top => top <= 0);
}

/** Speed over the last 100ms of samples, in px per ms; positive is down. */
export function flickVelocity(samples: readonly DragSample[]): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find(s => last.t - s.t <= FLICK_WINDOW_MS) ?? last;
  const elapsed = last.t - first.t;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

export function isTap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) <= TAP_SLOP_PX;
}

/** An rgb() or rgba() colour with its alpha multiplied by `factor`; any other value comes back unchanged. */
export function scaleAlpha(color: string, factor: number): string {
  const match = /^rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)$/.exec(color.replace(/\s/g, ''));
  if (!match) return color;
  const [, r, g, b, a] = match;
  const alpha = Math.round((a === undefined ? 1 : Number(a)) * factor * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Where the sheet sits for a finger `dy` px from where the drag started. */
export function sheetOffset(dy: number): number {
  return dy < 0 ? dy * UP_RESISTANCE : dy;
}

export function shouldClose(offset: number, height: number, velocity: number): boolean {
  return offset > height * CLOSE_FRACTION || velocity > FLICK_PX_PER_MS;
}
