import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** A link under the words. Following it ends the tour. */
  link?: { label: string; path: string };
}

/** How long the spotlight glides from one target to the next. Matches --qs-t-state. */
export const WALKTHROUGH_GLIDE_MS = 200;

@Injectable({ providedIn: 'root' })
export class WalkthroughService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private _isActive = signal(false);
  private _currentStepIndex = signal(0);
  private _steps = signal<WalkthroughStep[]>([]);
  private _targetRect = signal<DOMRect | null>(null);
  private _walkthroughId = signal('');
  private _gliding = signal(false);
  private _shownIndex = signal(0);

  isActive = this._isActive.asReadonly();
  currentStepIndex = this._currentStepIndex.asReadonly();
  steps = this._steps.asReadonly();
  targetRect = this._targetRect.asReadonly();
  /** True while the spotlight moves to a new step's target. The ring, dim and card animate only then. */
  gliding = this._gliding.asReadonly();
  /** The step on screen. It changes when the spotlight lands, so the card's words, the ring and the card move together. */
  shownStepIndex = this._shownIndex.asReadonly();
  shownStep = computed(() => this._steps()[this._shownIndex()] || null);

  currentStep = computed(() => {
    const steps = this._steps();
    const index = this._currentStepIndex();
    return steps[index] || null;
  });

  totalSteps = computed(() => this._steps().length);

  /** The target the spotlight is on now. */
  private shownTarget: string | null = null;
  /** True while the page scrolls to the next step's target. The spotlight and card hold still on screen until it stops. */
  private settling = false;
  /** Bumped on every step change, so a landing that is still waiting for its scroll gives up when a newer one starts. */
  private landing = 0;
  private glideTimer: ReturnType<typeof setTimeout> | undefined;

  start(id: string, steps: WalkthroughStep[]): void {
    if (!this.isBrowser || steps.length === 0) return;

    this._walkthroughId.set(id);
    this._steps.set(steps);
    this._currentStepIndex.set(0);
    this._shownIndex.set(0);
    this._targetRect.set(null);
    this.shownTarget = null;
    this.settling = false;
    this._isActive.set(true);
    this.land(false);
  }

  startIfNew(id: string, steps: WalkthroughStep[]): void {
    if (this.isCompleted(id)) return;
    this.start(id, steps);
  }

  next(): void {
    const nextIndex = this._currentStepIndex() + 1;
    if (nextIndex < this._steps().length) {
      this._currentStepIndex.set(nextIndex);
      this.land(true);
    } else {
      this.complete();
    }
  }

  previous(): void {
    const prevIndex = this._currentStepIndex() - 1;
    if (prevIndex >= 0) {
      this._currentStepIndex.set(prevIndex);
      this.land(true);
    }
  }

  skip(): void {
    this.complete();
  }

  /** Ends the tour. The step and its spotlight stay as they are, so the overlay can fade out showing them. */
  private complete(): void {
    const id = this._walkthroughId();
    if (id && this.isBrowser) {
      localStorage.setItem(`walkthrough_${id}_completed`, 'true');
    }
    this.landing++;
    this.settling = false;
    clearTimeout(this.glideTimer);
    this._gliding.set(false);
    this._isActive.set(false);
  }

  isCompleted(id: string): boolean {
    if (!this.isBrowser) return true;
    return localStorage.getItem(`walkthrough_${id}_completed`) === 'true';
  }

  resetCompletion(id: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(`walkthrough_${id}_completed`);
  }

  /** Measures the target the spotlight is on. Scroll and resize call this, with no animation, so the ring stays on it. */
  updateTargetRect(): void {
    if (!this.isBrowser || this.settling) return;
    const element = this.shownTarget ? this.findTarget(this.shownTarget) : null;
    this._targetRect.set(element ? element.getBoundingClientRect() : null);
  }

  /** The step's target. A page can mark the same target twice (the dashboard's desktop buttons and its phone bar),
   * so the one that is showing wins; with none showing, the first. */
  private findTarget(target: string): Element | null {
    const matches = Array.from(document.querySelectorAll(`[data-walkthrough="${target}"]`));
    return matches.find(el => el.getClientRects().length > 0) ?? matches[0] ?? null;
  }

  /** Brings the step's target into view, waits for the scroll to settle, then moves the spotlight onto it.
   * While the page scrolls, the spotlight and card hold still where they are, so they never fly in from off screen. */
  private land(glide: boolean): void {
    const token = ++this.landing;
    const step = this.currentStep();
    const element = step ? this.findTarget(step.target) : null;
    const reduced = this.prefersReducedMotion();
    const scrolled = element ? this.scrollToTarget(element, reduced ? 'instant' : 'smooth') : false;
    // The sticky header slides back in over 200ms after a scroll up, moving its contents without a scroll event
    const extraWait = scrolled && element?.closest('header') ? 220 : 0;

    const index = this._currentStepIndex();
    const arrive = () => {
      if (token !== this.landing || !this._isActive()) return;
      this.settling = false;
      this.shownTarget = step?.target ?? null;
      this._shownIndex.set(index);
      // The first step glides in too when the page had to scroll to it, since the card is already showing by then
      if ((glide || scrolled) && !reduced) {
        clearTimeout(this.glideTimer);
        this._gliding.set(true);
        this.glideTimer = setTimeout(() => this._gliding.set(false), WALKTHROUGH_GLIDE_MS + 40);
      }
      this.updateTargetRect();
    };

    // Reduced motion scrolls instantly, so the target is already in place
    if (!scrolled || !element || reduced) {
      arrive();
      return;
    }
    this.settling = true;
    this.whenStill(element, token, () => (extraWait ? setTimeout(arrive, extraWait) : arrive()));
  }

  /** Scrolls an off-screen target into view. Returns whether it asked for a scroll. */
  private scrollToTarget(element: Element, behavior: ScrollBehavior): boolean {
    const rect = element.getBoundingClientRect();
    if (element.closest('header')) {
      // The sticky header slides away when the page is scrolled down; going to the top brings it back
      if (window.scrollY === 0) return false;
      window.scrollTo({ top: 0, behavior });
      return true;
    }
    if (window.innerWidth < 640 && rect.height > window.innerHeight * 0.5) {
      // Too tall for the card to sit beside it: show its top 80px down, with the card over the lower part
      if (rect.top >= 64 && rect.top <= 140) return false;
      const el = element as HTMLElement;
      const margin = el.style.scrollMarginTop;
      el.style.scrollMarginTop = '80px';
      element.scrollIntoView({ block: 'start', behavior });
      el.style.scrollMarginTop = margin;
      return true;
    }
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      element.scrollIntoView({ block: 'center', behavior });
      return true;
    }
    return false;
  }

  /** Calls back once the element has stopped moving on screen for six frames (about 100ms), or after 1.2s at most.
   * Watching the element itself covers the page and any scrolling panel it sits in. */
  private whenStill(element: Element, token: number, done: () => void): void {
    const started = performance.now();
    let last = element.getBoundingClientRect();
    let still = 0;
    let moved = false;
    const tick = () => {
      if (token !== this.landing) return;
      const now = element.getBoundingClientRect();
      const same = Math.abs(now.top - last.top) < 0.5 && Math.abs(now.left - last.left) < 0.5;
      moved ||= !same;
      still = same ? still + 1 : 0;
      last = now;
      const elapsed = performance.now() - started;
      // A smooth scroll can take a frame or two to start, so stillness counts once it has moved or 200ms have passed
      if ((still >= 6 && (moved || elapsed > 200)) || elapsed > 1200) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
