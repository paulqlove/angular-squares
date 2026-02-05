import { Component, inject, HostListener, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalkthroughService } from '../../../core/services/walkthrough.service';

@Component({
  selector: 'app-walkthrough',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (walkthroughService.isActive() && walkthroughService.currentStep()) {
      <div class="fixed inset-0 z-[300]" (click)="onOverlayClick($event)">
        <!-- Overlay with cutout -->
        <div
          class="absolute inset-0 transition-all duration-300"
          [style]="overlayStyle()"
        ></div>

        <!-- Pulse ring around target -->
        @if (targetRect()) {
          <div
            class="absolute border-2 border-secondary-500 rounded-lg pointer-events-none animate-pulse-subtle"
            [style.left.px]="targetRect()!.left - 4"
            [style.top.px]="targetRect()!.top - 4"
            [style.width.px]="targetRect()!.width + 8"
            [style.height.px]="targetRect()!.height + 8"
          ></div>
        }

        <!-- Tooltip -->
        <div
          class="absolute bg-dialog rounded-xl shadow-2xl border border-default p-5 max-w-sm animate-tooltip-in"
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
                [class.bg-secondary-500]="$index === walkthroughService.currentStepIndex()"
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
                class="px-4 py-2 text-sm font-medium bg-control hover:bg-control-hover text-default rounded-lg transition-colors"
              >
                Back
              </button>
            }
            <button
              (click)="next()"
              class="px-4 py-2 text-sm font-medium bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
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
    });
  }

  isLastStep = computed(() => {
    return this.walkthroughService.currentStepIndex() === this.walkthroughService.totalSteps() - 1;
  });

  overlayStyle = computed(() => {
    const rect = this.targetRect();
    if (!rect) {
      return {
        background: 'rgba(0, 0, 0, 0.75)'
      };
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = Math.max(rect.width, rect.height) / 2 + 20;

    return {
      background: `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${radius}px, rgba(0, 0, 0, 0.75) ${radius + 2}px)`
    };
  });

  tooltipStyle = computed(() => {
    const rect = this.targetRect();
    const step = this.walkthroughService.currentStep();
    const position = step?.position || 'bottom';
    const padding = 16;
    const tooltipWidth = 320;

    if (!rect) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    let left: number;
    let top: number;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    switch (position) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - padding - 200;
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
        break;
    }

    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - 250));

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

  onOverlayClick(event: MouseEvent): void {
    event.stopPropagation();
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
