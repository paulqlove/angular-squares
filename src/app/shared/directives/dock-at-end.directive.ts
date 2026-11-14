import { Directive, OnDestroy, PLATFORM_ID, afterNextRender, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Phones only: the floating bottom bars dock from this width down. */
const PHONE_QUERY = '(max-width: 639.98px)';
/** On <html> while a bar is docked, so the browser's own strip under the page (Chrome's bottom chin) takes the bar's colour. */
const ROOT_CLASS = 'qs-bar-docked';
/**
 * Docks once the page is this close to its end. A few pixels, because phone scroll positions are fractional and Chrome
 * on Android settles the end of the page a pixel or two short while its toolbars slide in and out.
 */
const DOCK_AT = 6;
/** Undocks once the page is scrolled this far back up, so the bar doesn't flicker at the edge. */
const UNDOCK_AT = 24;

/**
 * Whether a bottom bar should be docked: true once the page is scrolled to its end, false again once it is scrolled
 * 24px back up. A page too short to scroll never docks.
 */
export function nextDocked(docked: boolean, scrollY: number, viewHeight: number, pageHeight: number): boolean {
  if (pageHeight - viewHeight <= DOCK_AT) return false;
  const fromEnd = pageHeight - (scrollY + viewHeight);
  if (!docked) return fromEnd <= DOCK_AT;
  return fromEnd < UNDOCK_AT;
}

/**
 * Put on a fixed bottom bar (with `.qs-dockable`): on phones, when the page is scrolled all the way down, the floating
 * bar turns into a solid bar flush with the screen's sides and bottom. Scrolling back up floats it again. The look and
 * the motion are in styles.scss under `.qs-dockable`.
 */
@Directive({
  selector: '[appDockAtEnd]',
  host: { '[class.qs-docked]': 'docked()' }
})
export class DockAtEndDirective implements OnDestroy {
  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    effect(() => {
      this.dockPaused();
      untracked(() => this.update());
    });
    effect(() => document.documentElement.classList.toggle(ROOT_CLASS, this.docked()));
    afterNextRender(() => {
      this.phone = window.matchMedia(PHONE_QUERY);
      this.phone.addEventListener('change', this.update);
      window.addEventListener('scroll', this.update, { passive: true });
      window.addEventListener('scrollend', this.settle, { passive: true });
      window.addEventListener('resize', this.settle, { passive: true });
      // Chrome on Android resizes the visual viewport as its toolbars slide, which can move the end of the page
      window.visualViewport?.addEventListener('resize', this.settle, { passive: true });
      // The page grows and shrinks as boards and squares load, which can move its end without a scroll
      this.resize = new ResizeObserver(this.update);
      this.resize.observe(document.documentElement);
      this.update();
    });
  }

  /** While true the bar stays floating, for example while the phone keyboard lifts it. */
  public dockPaused = input<boolean>(false);
  public docked = signal<boolean>(false);

  public ngOnDestroy(): void {
    this.phone?.removeEventListener('change', this.update);
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.update);
      window.removeEventListener('scrollend', this.settle);
      window.removeEventListener('resize', this.settle);
      window.visualViewport?.removeEventListener('resize', this.settle);
      document.documentElement.classList.remove(ROOT_CLASS);
    }
    cancelAnimationFrame(this.frame);
    this.resize?.disconnect();
  }

  private frame = 0;
  private phone: MediaQueryList | null = null;
  private resize: ResizeObserver | null = null;

  /** Checks now and again on the next frame, once a resize or the end of a scroll has finished laying out. */
  private readonly settle = (): void => {
    this.update();
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => requestAnimationFrame(this.update));
  };

  private readonly update = (): void => {
    if (!this.phone?.matches || this.dockPaused()) {
      this.docked.set(false);
      return;
    }
    const page = document.documentElement;
    this.docked.set(nextDocked(this.docked(), window.scrollY, window.innerHeight, page.scrollHeight));
  };
}
