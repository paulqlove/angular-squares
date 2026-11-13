import { Directive, OnDestroy, PLATFORM_ID, afterNextRender, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Phones only: the floating bottom bars dock from this width down. */
const PHONE_QUERY = '(max-width: 639.98px)';
/** Docks once the page is this close to its end. */
const DOCK_AT = 2;
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
    afterNextRender(() => {
      this.phone = window.matchMedia(PHONE_QUERY);
      this.phone.addEventListener('change', this.update);
      window.addEventListener('scroll', this.update, { passive: true });
      window.addEventListener('resize', this.update, { passive: true });
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
      window.removeEventListener('resize', this.update);
    }
    this.resize?.disconnect();
  }

  private phone: MediaQueryList | null = null;
  private resize: ResizeObserver | null = null;

  private readonly update = (): void => {
    if (!this.phone?.matches || this.dockPaused()) {
      this.docked.set(false);
      return;
    }
    const page = document.documentElement;
    this.docked.set(nextDocked(this.docked(), window.scrollY, window.innerHeight, page.scrollHeight));
  };
}
