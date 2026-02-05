import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

@Injectable({ providedIn: 'root' })
export class WalkthroughService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private _isActive = signal(false);
  private _currentStepIndex = signal(0);
  private _steps = signal<WalkthroughStep[]>([]);
  private _targetRect = signal<DOMRect | null>(null);
  private _walkthroughId = signal('');

  isActive = this._isActive.asReadonly();
  currentStepIndex = this._currentStepIndex.asReadonly();
  steps = this._steps.asReadonly();
  targetRect = this._targetRect.asReadonly();

  currentStep = computed(() => {
    const steps = this._steps();
    const index = this._currentStepIndex();
    return steps[index] || null;
  });

  totalSteps = computed(() => this._steps().length);

  start(id: string, steps: WalkthroughStep[]): void {
    if (!this.isBrowser || steps.length === 0) return;

    this._walkthroughId.set(id);
    this._steps.set(steps);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    this.updateTargetRect();
  }

  startIfNew(id: string, steps: WalkthroughStep[]): void {
    if (this.isCompleted(id)) return;
    this.start(id, steps);
  }

  next(): void {
    const nextIndex = this._currentStepIndex() + 1;
    if (nextIndex < this._steps().length) {
      this._currentStepIndex.set(nextIndex);
      this.updateTargetRect();
    } else {
      this.complete();
    }
  }

  previous(): void {
    const prevIndex = this._currentStepIndex() - 1;
    if (prevIndex >= 0) {
      this._currentStepIndex.set(prevIndex);
      this.updateTargetRect();
    }
  }

  skip(): void {
    this.complete();
  }

  private complete(): void {
    const id = this._walkthroughId();
    if (id && this.isBrowser) {
      localStorage.setItem(`walkthrough_${id}_completed`, 'true');
    }
    this._isActive.set(false);
    this._steps.set([]);
    this._currentStepIndex.set(0);
    this._targetRect.set(null);
  }

  isCompleted(id: string): boolean {
    if (!this.isBrowser) return true;
    return localStorage.getItem(`walkthrough_${id}_completed`) === 'true';
  }

  resetCompletion(id: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(`walkthrough_${id}_completed`);
  }

  updateTargetRect(): void {
    if (!this.isBrowser) return;

    const step = this.currentStep();
    if (!step) {
      this._targetRect.set(null);
      return;
    }

    const element = document.querySelector(`[data-walkthrough="${step.target}"]`);
    if (element) {
      this._targetRect.set(element.getBoundingClientRect());
    } else {
      this._targetRect.set(null);
    }
  }
}
