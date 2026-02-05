import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-ripple-grid',
  standalone: true,
  template: `<canvas #canvas class="w-full h-full"></canvas>`,
})
export class RippleGridComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() backgroundColor = '#10b981';
  @Input() lineColor = 'rgba(0,0,0,0.15)';
  @Input() cellSize = 60;
  @Input() rippleInterval = 4000;

  private platformId = inject(PLATFORM_ID);
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rippleIntervalId: ReturnType<typeof setInterval> | null = null;

  private rippleTime = 0;
  private rippleActive = false;
  private rippleOriginX = 0;
  private rippleOriginY = 0;
  private lastTimestamp = 0;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(canvas.parentElement || canvas);

    this.resizeCanvas();
    this.startAnimation();
    this.scheduleRipple();
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.rippleIntervalId !== null) {
      clearInterval(this.rippleIntervalId);
    }
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  private scheduleRipple(): void {
    this.triggerRipple();

    this.rippleIntervalId = setInterval(() => {
      this.triggerRipple();
    }, this.rippleInterval);
  }

  private triggerRipple(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.rippleOriginX = canvas.width / dpr / 2;
    this.rippleOriginY = canvas.height / dpr / 2;
    this.rippleTime = 0;
    this.rippleActive = true;
  }

  private startAnimation(): void {
    const animate = (timestamp: number) => {
      if (this.lastTimestamp === 0) {
        this.lastTimestamp = timestamp;
      }

      const deltaTime = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      if (this.rippleActive) {
        this.rippleTime += deltaTime;
        if (this.rippleTime > 3) {
          this.rippleActive = false;
        }
      }

      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private draw(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = this.lineColor;
    this.ctx.lineWidth = 1;

    this.drawGrid(width, height);
  }

  private drawGrid(width: number, height: number): void {
    if (!this.ctx) return;

    const cols = Math.ceil(width / this.cellSize) + 2;
    const rows = Math.ceil(height / this.cellSize) + 2;

    const offsetX = (width % this.cellSize) / 2 - this.cellSize;
    const offsetY = (height % this.cellSize) / 2 - this.cellSize;

    // Draw vertical lines
    for (let col = 0; col <= cols; col++) {
      const baseX = offsetX + col * this.cellSize;
      this.ctx.beginPath();

      for (let y = 0; y <= height; y += 5) {
        const point = this.applyRipple(baseX, y);
        if (y === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let row = 0; row <= rows; row++) {
      const baseY = offsetY + row * this.cellSize;
      this.ctx.beginPath();

      for (let x = 0; x <= width; x += 5) {
        const point = this.applyRipple(x, baseY);
        if (x === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }
  }

  private applyRipple(x: number, y: number): { x: number; y: number } {
    if (!this.rippleActive) {
      return { x, y };
    }

    const dx = x - this.rippleOriginX;
    const dy = y - this.rippleOriginY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return { x, y };
    }

    // Single ring expanding outward at ~230px/sec
    const ringRadius = this.rippleTime * 230;
    const ringWidth = 150;

    // Distance from the ring edge
    const distFromRing = Math.abs(distance - ringRadius);

    // Only affect points near the ring, with smooth falloff
    if (distFromRing > ringWidth) {
      return { x, y };
    }

    // Smooth bell curve falloff - points at ring center get max displacement
    const falloff = Math.cos((distFromRing / ringWidth) * Math.PI * 0.5);

    // Subtle amplitude that fades as ring expands
    const amplitude = 26 * falloff * Math.max(0, 1 - this.rippleTime * 0.3);

    const angle = Math.atan2(dy, dx);
    return {
      x: x + Math.cos(angle) * amplitude,
      y: y + Math.sin(angle) * amplitude,
    };
  }
}
