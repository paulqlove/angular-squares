import { Component, inject, HostListener, computed, effect, ChangeDetectionStrategy } from '@angular/core';

import { WalkthroughService } from '../../../core/services/walkthrough.service';

@Component({
    selector: 'app-walkthrough',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (walkthroughService.isActive() && walkthroughService.currentStep()) {
      <!-- No backdrop: the page stays visible and usable; only the target is outlined -->
      <div class="pointer-events-none fixed inset-0 z-[300]">
        @if (targetRect()) {
          <div
            class="absolute rounded-lg border-[3px] border-qs-accent transition-all duration-200"
            [style.left.px]="targetRect()!.left - 6"
            [style.top.px]="targetRect()!.top - 6"
            [style.width.px]="targetRect()!.width + 12"
            [style.height.px]="targetRect()!.height + 12"
            style="box-shadow: 0 0 0 6px color-mix(in srgb, var(--qs-accent) 25%, transparent), 0 0 28px color-mix(in srgb, var(--qs-accent) 45%, transparent)"
          ></div>
        }

        <!-- Tooltip -->
        <div
          class="pointer-events-auto absolute bg-dialog rounded-xl shadow-2xl border border-default p-5 max-w-sm animate-tooltip-in"
          [style]="tooltipStyle()"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-bold text-heading mb-2">
            {{ walkthroughService.currentStep()!.title }}
          </h3>
          <p class="text-sm text-muted mb-4">
            {{ walkthroughService.currentStep()!.description }}
          </p>

          <!-- Step dots -->
          <div class="flex items-center justify-center gap-1.5 mb-4">
            @for (step of walkthroughService.steps(); track $index) {
              <div
                class="w-2 h-2 rounded-full transition-colors"
                [class.bg-qs-accent]="$index === walkthroughService.currentStepIndex()"
                [class.bg-control]="$index !== walkthroughService.currentStepIndex()"
              ></div>
            }
          </div>

          <!-- Navigation buttons -->
          <div class="flex items-center gap-2">
            <button
              (click)="skip()"
              class="px-3 py-2 text-sm text-muted hover:text-default transition-colors"
            >
              Skip
            </button>
            <div class="flex-1"></div>
            @if (walkthroughService.currentStepIndex() > 0) {
              <button
                (click)="previous()"
                class="qs-btn qs-btn-secondary"
              >
                Back
              </button>
            }
            <button
              (click)="next()"
              class="qs-btn qs-btn-primary"
            >
              {{ isLastStep() ? 'Done' : 'Next' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class WalkthroughComponent {
  walkthroughService = inject(WalkthroughService);

  targetRect = this.walkthroughService.targetRect;

  constructor() {
    effect(() => {
      if (this.walkthroughService.isActive()) {
        this.walkthroughService.updateTargetRect();
      }
    }, { allowSignalWrites: true });
  }

  isLastStep = computed(() => {
    return this.walkthroughService.currentStepIndex() === this.walkthroughService.totalSteps() - 1;
  });

  tooltipStyle = computed(() => {
    const rect = this.targetRect();
    const step = this.walkthroughService.currentStep();
    const position = step?.position || 'bottom';
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // On a phone there is no room beside a target, so the card goes above or below it, or across the bottom
    const narrow = viewportWidth < 640;
    const tooltipWidth = narrow ? Math.min(viewportWidth - padding * 2, 384) : 320;
    const tooltipHeight = 230;

    if (!rect) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    let left: number;
    let top: number;

    switch (narrow && (position === 'left' || position === 'right') ? 'bottom' : position) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - padding - tooltipHeight;
        if (top < padding) top = rect.bottom + padding;
        break;
      case 'left':
        left = rect.left - tooltipWidth - padding;
        top = rect.top + rect.height / 2 - 100;
        break;
      case 'right':
        left = rect.right + padding;
        top = rect.top + rect.height / 2 - 100;
        break;
      case 'center':
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        };
      case 'bottom':
      default:
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.bottom + padding;
        if (top + tooltipHeight > viewportHeight - padding && rect.top - padding - tooltipHeight >= padding) {
          top = rect.top - padding - tooltipHeight;
        }
        break;
    }

    left = narrow ? (viewportWidth - tooltipWidth) / 2 : Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`
    };
  });

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onPositionChange(): void {
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
}
