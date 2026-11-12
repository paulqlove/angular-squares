import { Component, inject, HostListener, computed, signal, ChangeDetectionStrategy, DestroyRef, ElementRef, afterNextRender, viewChild, effect, untracked } from '@angular/core';

import { WALKTHROUGH_GLIDE_MS, WalkthroughService } from '../../../core/services/walkthrough.service';

/** Space between the target and the ring. */
const GAP = 6;
/** The ring's corner radius and thickness. */
const RADIUS = 10;
const RING = 3;
/** Space between the ring and the card, and between the card and the screen edge. */
const PADDING = 16;

/** The ring's outer box, and how visible it is (0 hides the ring and the hole). */
interface Box { x: number; y: number; w: number; h: number; o: number; }

/** A rounded rectangle as SVG path commands, for the hole in the dim. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const c = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + c} ${y}H${x + w - c}A${c} ${c} 0 0 1 ${x + w} ${y + c}V${y + h - c}A${c} ${c} 0 0 1 ${x + w - c} ${y + h}`
    + `H${x + c}A${c} ${c} 0 0 1 ${x} ${y + h - c}V${y + c}A${c} ${c} 0 0 1 ${x + c} ${y}Z`;
}

/**
 * The tour: dims the page, cuts a hole around the step's target with a ring around it, and shows the step's card.
 * The dim and the ring are one SVG drawn at real size. An earlier version stretched 1px layers by hundreds of times,
 * which Android Chrome drew with gaps and black bands. Between steps the ring glides (a short tween of its box),
 * and the card stays on screen, glides with it and crossfades its words.
 */
@Component({
    selector: 'app-walkthrough',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
      .tour { position: fixed; inset: 0; z-index: 300; pointer-events: none; }
      /* One drawing for the dim and the ring, at real size: no scaled layers, which Android Chrome draws with gaps */
      .tour-svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }
      .tour-dim { fill: var(--qs-tour-dim); }
      .tour-ring { fill: none; stroke: var(--qs-accent); }
      .tour-glide .tour-card-wrap { transition: transform var(--qs-t-state) var(--qs-ease-decel); }
      .tour-card-wrap { position: absolute; left: 0; top: 0; pointer-events: auto; }
    `],
    template: `
    @if (walkthroughService.isActive() && walkthroughService.shownStep()) {
      <div class="tour" [class.tour-glide]="walkthroughService.gliding()" animate.enter="qs-tour-enter" animate.leave="qs-tour-leave">
        <!-- Dim with a hole cut around the target, and the ring around the hole. The page stays usable, as before; only the card takes clicks. -->
        <svg class="tour-svg" aria-hidden="true" focusable="false">
          <path class="tour-dim" fill-rule="evenodd" [attr.d]="g().dim" />
          <rect class="tour-ring" [attr.x]="g().ringX" [attr.y]="g().ringY" [attr.width]="g().ringW" [attr.height]="g().ringH"
            [attr.rx]="g().ringR" [attr.stroke-width]="ring" [attr.opacity]="g().ringO" />
        </svg>

        <!-- Card: stays up between steps and glides with the ring; its words crossfade -->
        <div class="tour-card-wrap" [style.width.px]="card().w" [style.transform]="card().transform" (click)="$event.stopPropagation()">
          <div #cardEl class="qs-tour-card rounded-xl border border-qs-line-strong bg-qs-panel p-5">
            <div class="grid" aria-live="polite">
              @for (step of shownSteps(); track step) {
                <div class="[grid-area:1/1]" animate.enter="qs-tour-swap-in" animate.leave="qs-tour-swap-out">
                  <h3 class="text-lg font-bold text-qs-ink mb-2">{{ step.title }}</h3>
                  <p class="text-sm text-qs-muted mb-4">{{ step.description }}</p>
                </div>
              }
            </div>

            <!-- Step dots -->
            <div class="flex items-center justify-center gap-1.5 mb-4">
              @for (step of walkthroughService.steps(); track $index) {
                <div
                  class="w-2 h-2 rounded-full transition-colors"
                  [class.bg-qs-accent]="$index === walkthroughService.shownStepIndex()"
                  [class.bg-qs-panel-2]="$index !== walkthroughService.shownStepIndex()"
                ></div>
              }
            </div>

            <!-- Navigation buttons -->
            <div class="flex items-center gap-2">
              <button (click)="skip()" class="px-3 py-2 text-sm text-qs-muted hover:text-qs-ink transition-colors">Skip</button>
              <div class="flex-1"></div>
              @if (walkthroughService.shownStepIndex() > 0) {
                <button (click)="previous()" class="qs-btn qs-btn-secondary">Back</button>
              }
              <button (click)="next()" class="qs-btn qs-btn-primary">{{ isLastStep() ? 'Done' : 'Next' }}</button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class WalkthroughComponent {
  constructor() {
    afterNextRender(() => {
      this.measureViewport();
      // Capture: scrolling panels inside the page fire scroll events that don't bubble
      const onScroll = () => this.walkthroughService.updateTargetRect();
      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll, { capture: true }));
    });
    // Watch the card's height while it's on screen, since where it sits above a target depends on it
    effect(onCleanup => {
      const el = this.cardRef()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      this.measureViewport();
      this.cardHeight.set(el.offsetHeight);
      const observer = new ResizeObserver(() => this.cardHeight.set(el.offsetHeight));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
    // Move the ring to each new target: a glide between steps, a jump otherwise (first step, scroll, resize)
    effect(() => {
      const to = this.target();
      untracked(() => this.moveTo(to, this.walkthroughService.gliding()));
    });
    this.destroyRef.onDestroy(() => this.stopTween());
  }

  walkthroughService = inject(WalkthroughService);

  /** Where the card sits: a translate from the top left corner, and its width. */
  card = computed(() => {
    const { w: vw, h: vh } = this.viewport();
    const rect = this.walkthroughService.targetRect();
    const position = this.walkthroughService.shownStep()?.position || 'bottom';
    // On a phone there is no room beside a target, so the card goes above or below it
    const narrow = vw < 640;
    const width = narrow ? Math.min(vw - PADDING * 2, 384) : 320;
    const height = this.cardHeight() || 230;
    const at = (x: number, y: number) => ({ w: width, transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)` });

    if (!rect || position === 'center') return at((vw - width) / 2, (vh - height) / 2);

    let left: number;
    let top: number;
    const above = rect.top - GAP - PADDING - height;
    const below = rect.bottom + GAP + PADDING;
    switch (narrow && (position === 'left' || position === 'right') ? 'bottom' : position) {
      case 'top':
        left = rect.left + rect.width / 2 - width / 2;
        top = above >= PADDING ? above : below;
        break;
      case 'left':
        left = rect.left - GAP - PADDING - width;
        top = rect.top + rect.height / 2 - height / 2;
        break;
      case 'right':
        left = rect.right + GAP + PADDING;
        top = rect.top + rect.height / 2 - height / 2;
        break;
      case 'bottom':
      default:
        left = rect.left + rect.width / 2 - width / 2;
        top = below + height > vh - PADDING && above >= PADDING ? above : below;
        break;
    }
    left = narrow ? (vw - width) / 2 : Math.max(PADDING, Math.min(left, vw - width - PADDING));
    top = Math.max(PADDING, Math.min(top, vh - height - PADDING));
    return at(left, top);
  });

  /** The dim's outline with its hole, and the ring, from where the ring is drawn right now. */
  g = computed(() => {
    const { x, y, w, h, o } = this.drawn();
    const half = RING / 2;
    // The hole is the ring's inner edge; the dim reaches far past the screen so a resize never shows an edge
    const hole = roundedRect(x + RING, y + RING, Math.max(0, w - RING * 2), Math.max(0, h - RING * 2), RADIUS - RING);
    return {
      dim: `M-10000 -10000H20000V20000H-10000Z${o > 0 ? hole : ''}`,
      ringX: x + half,
      ringY: y + half,
      ringW: Math.max(0, w - RING),
      ringH: Math.max(0, h - RING),
      ringR: RADIUS - half,
      ringO: o
    };
  });

  /** The ring's thickness, for the template. */
  readonly ring = RING;

  isLastStep = computed(() => this.walkthroughService.shownStepIndex() === this.walkthroughService.totalSteps() - 1);

  /** The step on screen, as a list of one, so a new step's words come in while the old ones fade out. */
  shownSteps = computed(() => {
    const step = this.walkthroughService.shownStep();
    return step ? [step] : [];
  });

  viewport = signal({ w: 1024, h: 768 });

  @HostListener('window:resize')
  onResize(): void {
    this.measureViewport();
    this.walkthroughService.updateTargetRect();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.walkthroughService.isActive()) this.skip();
  }

  next(): void {
    this.walkthroughService.next();
  }

  previous(): void {
    this.walkthroughService.previous();
  }

  skip(): void {
    this.walkthroughService.skip();
  }

  private cardHeight = signal(0);
  /** Where the ring is drawn right now; differs from target() only mid-glide. */
  private drawn = signal<Box>({ x: 0, y: 0, w: 0, h: 0, o: 0 });
  private frame = 0;
  /** Where the ring belongs for the step on screen, on whole pixels. With no target there is no hole and no ring. */
  private target = computed<Box>(() => {
    const rect = this.walkthroughService.targetRect();
    if (!rect || this.walkthroughService.shownStep()?.position === 'center') return { ...untracked(this.drawn), o: 0 };
    return {
      x: Math.round(rect.left - GAP - RING),
      y: Math.round(rect.top - GAP - RING),
      w: Math.round(rect.width + (GAP + RING) * 2),
      h: Math.round(rect.height + (GAP + RING) * 2),
      o: 1
    };
  });
  private cardRef = viewChild<ElementRef<HTMLElement>>('cardEl');
  private destroyRef = inject(DestroyRef);

  private moveTo(to: Box, glide: boolean): void {
    this.stopTween();
    const from = this.drawn();
    if (!glide || typeof requestAnimationFrame === 'undefined') {
      this.drawn.set(to);
      return;
    }
    // Coming from no ring: fade it in where it lands rather than flying in from the last spot
    const start = from.o === 0 ? { ...to, o: 0 } : from;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / WALKTHROUGH_GLIDE_MS);
      const e = 1 - Math.pow(1 - t, 3);
      const mix = (a: number, b: number) => a + (b - a) * e;
      this.drawn.set({
        x: Math.round(mix(start.x, to.x)), y: Math.round(mix(start.y, to.y)),
        w: Math.round(mix(start.w, to.w)), h: Math.round(mix(start.h, to.h)), o: mix(start.o, to.o)
      });
      this.frame = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopTween(): void {
    if (this.frame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private measureViewport(): void {
    this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
  }
}
