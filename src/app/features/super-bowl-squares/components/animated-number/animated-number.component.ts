import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-number',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative h-full w-full flex items-center justify-center">
      {{ displayNumber !== null ? displayNumber : '' }}
    </div>
  `
})
export class AnimatedNumberComponent implements OnDestroy {
  @Input() number: number | null = null;
  displayNumber: number | null = null;
  private animationInterval: any;

  @Input() set animate(value: boolean) {
    if (value && this.number !== null) {
      this.startSlotAnimation();
    } else if (!value) {
      this.stopAnimation();
      this.displayNumber = this.number;
    }
  }

  ngOnDestroy() {
    this.stopAnimation();
  }

  private startSlotAnimation() {
    let duration = 0;
    const finalNumber = this.number;
    
    this.animationInterval = setInterval(() => {
      this.displayNumber = Math.floor(Math.random() * 10);
      duration += 50;

      if (duration > 1000) {
        this.stopAnimation();
        this.displayNumber = finalNumber;
      }
    }, 50);
  }

  private stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
} 