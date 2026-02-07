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

const FLASH_COLORS = [
  '#fecaca', '#bfdbfe', '#bbf7d0', '#fef08a', '#e9d5ff',
  '#fbcfe8', '#c7d2fe', '#fed7aa', '#99f6e4', '#a5f3fc',
  '#d9f99d', '#a7f3d0', '#bae6fd', '#ddd6fe', '#f5d0fe',
  '#fecdd3', '#fde68a',
];

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

  private cellColors: string[] = [];
  private gridCols = 0;
  private gridRows = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private lastTimestamp = 0;
  private rippleActive = false;
  private rippleDuration = 0;
  private rippleOriginX = 0;
  private rippleOriginY = 0;
  private rippleTime = 0;

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

    this.gridCols = Math.ceil(rect.width / this.cellSize) + 2;
    this.gridRows = Math.ceil(rect.height / this.cellSize) + 2;
    this.gridOffsetX = (rect.width % this.cellSize) / 2 - this.cellSize;
    this.gridOffsetY = (rect.height % this.cellSize) / 2 - this.cellSize;

    const maxRadius = Math.sqrt((rect.width / 2) ** 2 + (rect.height / 2) ** 2) + 150;
    this.rippleDuration = maxRadius / 230;
  }

  private scheduleRipple(): void {
    this.triggerRipple();

    const interval = Math.max(this.rippleInterval, (this.rippleDuration + 1) * 1000);
    this.rippleIntervalId = setInterval(() => {
      this.triggerRipple();
    }, interval);
  }

  private triggerRipple(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.rippleOriginX = canvas.width / dpr / 2;
    this.rippleOriginY = canvas.height / dpr / 2;
    this.rippleTime = 0;
    this.rippleActive = true;

    const totalCells = this.gridCols * this.gridRows;
    if (this.cellColors.length < totalCells) {
      this.cellColors = new Array(totalCells);
    }
    for (let i = 0; i < totalCells; i++) {
      this.cellColors[i] = FLASH_COLORS[(Math.random() * FLASH_COLORS.length) | 0];
    }
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
        if (this.rippleTime > this.rippleDuration) {
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

    if (this.rippleActive) {
      this.drawCellColors();
    }

    this.ctx.strokeStyle = this.lineColor;
    this.ctx.lineWidth = 1;

    this.drawGrid(width, height);
  }

  private drawCellColors(): void {
    if (!this.ctx) return;

    const ringRadius = this.rippleTime * 230;
    const ringWidth = 150;
    const fade = Math.max(0, 1 - this.rippleTime / this.rippleDuration);

    for (let row = 0; row < this.gridRows; row++) {
      const cellY = this.gridOffsetY + row * this.cellSize;
      const centerY = cellY + this.cellSize / 2;

      for (let col = 0; col < this.gridCols; col++) {
        const cellX = this.gridOffsetX + col * this.cellSize;
        const centerX = cellX + this.cellSize / 2;

        const dx = centerX - this.rippleOriginX;
        const dy = centerY - this.rippleOriginY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const distFromRing = Math.abs(distance - ringRadius);

        if (distFromRing > ringWidth) continue;

        const falloff = Math.cos((distFromRing / ringWidth) * Math.PI * 0.5);
        const alpha = Math.min(0.6, falloff * fade);

        if (alpha < 0.01) continue;

        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = this.cellColors[row * this.gridCols + col];
        this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
      }
    }

    this.ctx.globalAlpha = 1;
  }

  private drawGrid(width: number, height: number): void {
    if (!this.ctx) return;

    // Draw vertical lines
    for (let col = 0; col <= this.gridCols; col++) {
      const baseX = this.gridOffsetX + col * this.cellSize;
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
    for (let row = 0; row <= this.gridRows; row++) {
      const baseY = this.gridOffsetY + row * this.cellSize;
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
    const amplitude = 26 * falloff * Math.max(0, 1 - this.rippleTime / this.rippleDuration);

    const angle = Math.atan2(dy, dx);
    return {
      x: x + Math.cos(angle) * amplitude,
      y: y + Math.sin(angle) * amplitude,
    };
  }
}
