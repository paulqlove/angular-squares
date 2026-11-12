import { Component, inject, HostListener, computed, signal, ChangeDetectionStrategy, DestroyRef, ElementRef, afterNextRender, viewChild, effect } from '@angular/core';

import { RouterLink } from '@angular/router';

import { WalkthroughService } from '../../../core/services/walkthrough.service';

/** Space between the target and the ring. */
const GAP = 6;
/** The ring's corner radius and thickness. */
const RADIUS = 10;
const RING = 3;
/** Space between the ring and the card, and between the card and the screen edge. */
const PADDING = 16;

/**
 * The tour: dims the page, cuts a hole around the step's target with a ring around it, and shows the step's card.
 * Everything moves with transform only. The dim is four panels around the hole and the ring is four corners and four
 * edges, so a move between targets is a translate and a one-axis scale, never a change to position or size.
 * Between steps the card stays on screen, glides with the ring and crossfades its words.
 */
@Component({
    selector: 'app-walkthrough',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
      .tour { position: fixed; inset: 0; z-index: 300; overflow: hidden; pointer-events: none; }
      .tour-piece { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
      .tour-dim { background: var(--qs-tour-dim); }
      .tour-ring { background: var(--qs-accent); }
      .tour-corner { width: 10px; height: 10px; border: 0 solid var(--qs-accent); }
      .tour-glide .tour-piece, .tour-glide .tour-card-wrap {
        transition: transform var(--qs-t-state) var(--qs-ease-decel), opacity var(--qs-t-state) var(--qs-ease-decel);
      }
      .tour-card-wrap { position: absolute; left: 0; top: 0; pointer-events: auto; }
    `],
    template: `
    @if (walkthroughService.isActive() && walkthroughService.shownStep()) {
      <div class="tour" [class.tour-glide]="walkthroughService.gliding()" animate.enter="qs-tour-enter" animate.leave="qs-tour-leave">
        <!-- Dim: four panels around the hole. The page stays usable, as before; only the card takes clicks. -->
        <div class="tour-piece tour-dim w-full" [style.height.px]="viewport().h" [style.transform]="g().dimTop"></div>
        <div class="tour-piece tour-dim w-full" [style.height.px]="viewport().h" [style.transform]="g().dimBottom"></div>
        <div class="tour-piece tour-dim h-px" [style.width.px]="viewport().w" [style.transform]="g().dimLeft"></div>
        <div class="tour-piece tour-dim h-px" [style.width.px]="viewport().w" [style.transform]="g().dimRight"></div>

        <!-- Ring: corners move, edges move and stretch along their own length, so the line keeps its thickness -->
        <div class="tour-piece tour-corner" style="border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 10px" [style.transform]="g().tl" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-corner" style="border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 10px" [style.transform]="g().tr" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-corner" style="border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 10px" [style.transform]="g().bl" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-corner" style="border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 10px" [style.transform]="g().br" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-ring w-px" style="height: 3px" [style.transform]="g().top" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-ring w-px" style="height: 3px" [style.transform]="g().bottom" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-ring h-px" style="width: 3px" [style.transform]="g().left" [style.opacity]="g().ring ? 1 : 0"></div>
        <div class="tour-piece tour-ring h-px" style="width: 3px" [style.transform]="g().right" [style.opacity]="g().ring ? 1 : 0"></div>

        <!-- Card: stays up between steps and glides with the ring; its words crossfade -->
        <div class="tour-card-wrap" [style.width.px]="card().w" [style.transform]="card().transform" (click)="$event.stopPropagation()">
          <div #cardEl class="qs-tour-card rounded-xl border border-qs-line-strong bg-qs-panel p-5">
            <div class="grid" aria-live="polite">
              @for (step of shownSteps(); track step) {
                <div class="[grid-area:1/1]" animate.enter="qs-tour-swap-in" animate.leave="qs-tour-swap-out">
                  <h3 class="text-lg font-bold text-qs-ink mb-2">{{ step.title }}</h3>
                  <p class="text-sm text-qs-muted mb-4">{{ step.description }}</p>
                  @if (step.link) {
                    <a [routerLink]="step.link.path" (click)="skip()" class="-mt-2 mb-4 inline-flex items-center gap-1 text-sm font-semibold text-qs-accent underline-offset-4 hover:underline">{{ step.link.label }} <span aria-hidden="true">→</span></a>
                  }
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

  /** The dim panels and ring pieces as transforms. With no target the hole closes to a point in the middle. */
  g = computed(() => {
    const { w: vw, h: vh } = this.viewport();
    const rect = this.walkthroughService.targetRect();
    const ring = !!rect && this.walkthroughService.shownStep()?.position !== 'center';
    // The ring's outer box, on whole pixels so the pieces meet without seams
    const x = ring ? Math.round(rect!.left - GAP - RING) : Math.round(vw / 2);
    const y = ring ? Math.round(rect!.top - GAP - RING) : Math.round(vh / 2);
    const w = ring ? Math.round(rect!.width + (GAP + RING) * 2) : 0;
    const h = ring ? Math.round(rect!.height + (GAP + RING) * 2) : 0;
    // The hole is the ring's inner edge; the ring covers the dim's square corners
    const hx = ring ? x + RING : x;
    const hy = ring ? y + RING : y;
    const hw = Math.max(0, w - RING * 2);
    const hh = Math.max(0, h - RING * 2);
    const t = (tx: number, ty: number) => `translate(${tx}px, ${ty}px)`;
    // Edges overlap the corners by 1px each side, so no hairline shows mid-glide
    const across = Math.max(0, w - RADIUS * 2 + 2);
    const down = Math.max(0, h - RADIUS * 2 + 2);
    return {
      ring,
      dimTop: t(0, hy - vh),
      dimBottom: t(0, hy + hh),
      dimLeft: `${t(hx - vw, hy)} scaleY(${hh})`,
      dimRight: `${t(hx + hw, hy)} scaleY(${hh})`,
      tl: t(x, y),
      tr: t(x + w - RADIUS, y),
      bl: t(x, y + h - RADIUS),
      br: t(x + w - RADIUS, y + h - RADIUS),
      top: `${t(x + RADIUS - 1, y)} scaleX(${across})`,
      bottom: `${t(x + RADIUS - 1, y + h - RING)} scaleX(${across})`,
      left: `${t(x, y + RADIUS - 1)} scaleY(${down})`,
      right: `${t(x + w - RING, y + RADIUS - 1)} scaleY(${down})`
    };
  });

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
  private cardRef = viewChild<ElementRef<HTMLElement>>('cardEl');
  private destroyRef = inject(DestroyRef);

  private measureViewport(): void {
    this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
  }
}
