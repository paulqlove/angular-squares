import { DestroyRef, Directive, ElementRef, effect, inject, input, output } from '@angular/core';

import { PHONE_QUERY } from '../../../shared/media-queries';
import { DragSample, backdropOpacity, canDragFrom, flickVelocity, isTap, scaleAlpha, sheetOffset, shouldClose } from './sheet-drag.utils';

const BACK_MS = 200;
/** Inside content that scrolls, a touch is held from scrolling only once it is clearly heading down by this much. */
const HOLD_SCROLL_PX = 4;
/** A press that moved swallows the click it fires; this covers that click and nothing after it. */
const MOVED_SWALLOW_MS = 100;
const OUT_MS = 120;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/**
 * After a swipe closes a sheet, every click is swallowed this long: the leaving backdrop stops taking clicks at once
 * (qs-modal-leave), so without this a tap during the close would land on the board underneath.
 */
const SWIPE_SWALLOW_MS = 350;

/**
 * Swipe down to close, on the panel of a phone bottom sheet. Pointer events track the finger; a non-passive touchmove
 * stops the browser scrolling once a drag has started, or is about to. Touch and pen only, under 640px only.
 * Inline styles are set !important because the reduced-motion rules in styles.scss pin sheet transforms with !important.
 */
@Directive({
  selector: '[appSheetDrag]',
  host: {
    '(pointercancel)': 'cancel()',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'release($event)'
  }
})
export class SheetDragDirective {
  constructor() {
    if (typeof window === 'undefined') return;
    // Only sheets that drag get a non-passive listener; on any other panel it would hold back scrolling for nothing.
    effect(onCleanup => {
      if (!this.appSheetDrag()) return;
      this.host.addEventListener('touchmove', this.blockScroll, { passive: false });
      onCleanup(() => this.host.removeEventListener('touchmove', this.blockScroll));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.settleTimer));
  }

  /** On: the panel can be swiped down. */
  readonly appSheetDrag = input(false);
  /** The dimmed layer behind the sheet. Its dim fades as the sheet moves. */
  readonly sheetBackdrop = input.required<HTMLElement>();
  /** Swiped far or fast enough. The sheet is already leaving; the owner closes it, or calls snapBack() to keep it. */
  readonly swipeClosed = output<void>();

  /** Drops every style a drag left, so a sheet reopened mid-close shows where it rests. */
  reset(): void {
    clearTimeout(this.settleTimer);
    for (const prop of ['transition', 'transform', 'opacity']) this.host.style.removeProperty(prop);
    for (const prop of ['transition', 'background-color']) this.sheetBackdrop().style.removeProperty(prop);
  }

  /** Puts the sheet back where it rests: 200ms on --qs-ease, or a plain 120ms fade with reduced motion. */
  snapBack(): void {
    const backdrop = this.sheetBackdrop();
    if (matchMedia(REDUCED_MOTION).matches) {
      setStyles(this.host, { transition: 'none', transform: 'none', opacity: '0' });
      void this.host.offsetHeight;
      setStyles(this.host, { transition: `opacity ${OUT_MS}ms linear`, opacity: '1' });
      setStyles(backdrop, { transition: `background-color ${OUT_MS}ms linear`, 'background-color': this.backdropColor });
    } else {
      setStyles(this.host, { transition: `transform ${BACK_MS}ms var(--qs-ease)`, transform: 'translateY(0)' });
      setStyles(backdrop, { transition: `background-color ${BACK_MS}ms var(--qs-ease)`, 'background-color': this.backdropColor });
    }
    // A sheet that stays open takes taps again at once, apart from the click the drag itself fires.
    this.swallowUntil = Math.min(this.swallowUntil, performance.now() + MOVED_SWALLOW_MS);
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.reset(), BACK_MS);
  }

  protected cancel(): void {
    if (this.phase === 'dragging') this.snapBack();
    this.phase = 'off';
    this.pressed = false;
  }

  protected move(event: PointerEvent): void {
    if (!this.pressed || !event.isPrimary) return;
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    if (!isTap(dx, dy)) this.moved = true;
    if (this.phase === 'pending') this.begin(event, dx, dy);
    else if (this.phase === 'dragging') this.follow(event);
  }

  protected press(event: PointerEvent): void {
    if (!this.appSheetDrag() || !event.isPrimary || event.pointerType === 'mouse' || !matchMedia(PHONE_QUERY).matches) return;
    this.pressed = true;
    this.phase = 'pending';
    this.moved = false;
    this.start = { x: event.clientX, y: event.clientY };
    this.scrollTops = scrollTopsBetween(event.target, this.host);
    this.samples = [];
  }

  protected release(event: PointerEvent): void {
    if (!this.pressed || !event.isPrimary) return;
    this.pressed = false;
    const dragged = this.phase === 'dragging';
    this.phase = 'off';
    // The lift counts toward the flick, so a drag that stopped before letting go doesn't fling.
    if (dragged) this.samples.push({ y: event.clientY, t: event.timeStamp });
    const close = dragged && shouldClose(this.offset, this.height, flickVelocity(this.samples));
    if (this.moved) this.swallowClicks(close ? SWIPE_SWALLOW_MS : MOVED_SWALLOW_MS);
    if (!dragged) return;
    if (!close) {
      this.snapBack();
      return;
    }
    this.leave();
    this.swipeClosed.emit();
  }

  private backdropColor = '';
  private height = 0;
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private listening = false;
  private moved = false;
  private offset = 0;
  private originY = 0;
  private phase: 'off' | 'pending' | 'dragging' = 'off';
  private pressed = false;
  private samples: DragSample[] = [];
  private scrollTops: number[] = [];
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private start = { x: 0, y: 0 };
  private swallowUntil = 0;
  private unlistenTimer: ReturnType<typeof setTimeout> | undefined;

  /** Starts the drag once the finger is past tap distance, going mostly up or down, from somewhere that may drag. */
  private begin(event: PointerEvent, dx: number, dy: number): void {
    if (isTap(dx, dy)) return;
    if (Math.abs(dx) > Math.abs(dy) || !canDragFrom(this.scrollTops, dy)) {
      this.phase = 'off';
      return;
    }
    clearTimeout(this.settleTimer);
    this.phase = 'dragging';
    this.originY = event.clientY;
    this.height = this.host.getBoundingClientRect().height;
    this.backdropColor = getComputedStyle(this.sheetBackdrop()).backgroundColor;
    try { this.host.setPointerCapture(event.pointerId); } catch { /* the pointer is already gone; the drag ends on its own */ }
    setStyles(this.host, { transition: 'none', opacity: '1' });
    setStyles(this.sheetBackdrop(), { transition: 'none' });
    this.follow(event);
  }

  /**
   * Stops the page or the sheet's content scrolling under a drag. Where nothing scrolls (grabber, header) that is any
   * move; inside content that scrolls, only one clearly heading down from its top, since the browser keeps a cancelled
   * gesture from scrolling to its end. Taps are untouched: only touchmove is cancelled.
   */
  private blockScroll = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!event.cancelable || !touch) return;
    const dx = touch.clientX - this.start.x;
    const dy = touch.clientY - this.start.y;
    const heldBack = this.phase === 'pending' && (!this.scrollTops.length || (dy >= HOLD_SCROLL_PX && dy > Math.abs(dx) && canDragFrom(this.scrollTops, dy)));
    if (this.phase === 'dragging' || heldBack) event.preventDefault();
  };

  /** Eats every click on the page, in the capture phase so it never reaches the sheet or the board. */
  private eatClick = (event: MouseEvent): void => {
    if (performance.now() > this.swallowUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private follow(event: PointerEvent): void {
    this.offset = sheetOffset(event.clientY - this.originY);
    this.samples.push({ y: event.clientY, t: event.timeStamp });
    if (this.samples.length > 20) this.samples.shift();
    setStyles(this.host, { transform: `translateY(${this.offset}px)` });
    setStyles(this.sheetBackdrop(), { 'background-color': scaleAlpha(this.backdropColor, backdropOpacity(this.offset, this.height)) });
  }

  /** Sends the sheet off the bottom at 120ms --qs-ease-in, or fades it in place with reduced motion. */
  private leave(): void {
    const reduced = matchMedia(REDUCED_MOTION).matches;
    const curve = reduced ? 'linear' : 'var(--qs-ease-in)';
    if (reduced) setStyles(this.host, { transition: `opacity ${OUT_MS}ms linear`, opacity: '0' });
    else setStyles(this.host, { transition: `transform ${OUT_MS}ms ${curve}`, transform: `translateY(${Math.max(this.offset, this.height)}px)` });
    setStyles(this.sheetBackdrop(), { transition: `background-color ${OUT_MS}ms ${curve}`, 'background-color': scaleAlpha(this.backdropColor, 0) });
  }

  /** Swallows clicks for `ms`. The listener is window-wide and outlives the sheet, which may be gone before the time is up. */
  private swallowClicks(ms: number): void {
    this.swallowUntil = performance.now() + ms;
    if (!this.listening) window.addEventListener('click', this.eatClick, true);
    this.listening = true;
    clearTimeout(this.unlistenTimer);
    this.unlistenTimer = setTimeout(() => {
      window.removeEventListener('click', this.eatClick, true);
      this.listening = false;
    }, ms);
  }
}

/** The scrollTop of each box between the touch and the sheet that has content to scroll, the sheet included. */
function scrollTopsBetween(target: EventTarget | null, sheet: HTMLElement): number[] {
  const tops: number[] = [];
  for (let el = target instanceof Element ? target : null; el; el = el === sheet ? null : el.parentElement) {
    if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) tops.push(el.scrollTop);
  }
  return tops;
}

function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  for (const [prop, value] of Object.entries(styles)) el.style.setProperty(prop, value, 'important');
}
