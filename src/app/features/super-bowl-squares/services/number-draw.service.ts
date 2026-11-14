import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { numberDrawMs } from '../../../core/utils/draw-numbers';
import { GameStateService } from './game-state.service';

/**
 * The numbers the board shows and their reveal. Each browser plays the draw once per set of numbers; it remembers
 * the set it last saw in localStorage (`qs-numbers-seen-{gameId}`).
 */
@Injectable()
export class NumberDrawService {
  // Public properties

  public readonly displayAwayNumbers: WritableSignal<(number | null)[]> = signal([]);
  public readonly displayHomeNumbers: WritableSignal<(number | null)[]> = signal([]);
  public readonly isAnimatingNumbers: WritableSignal<boolean> = signal(false);

  // Public functions

  /** Check on load if we need to animate (first time seeing these numbers). */
  public checkAndPlayAnimation(): void {
    if (!this.state.isRandomized || this.hasSeenNumbers()) {
      // Numbers cleared, or already seen: stop any running animation and show them as they are
      this.stopAnimation();
      this.showStoredNumbers();
      return;
    }
    this.playNumberRevealAnimation(this.state.homeNumbers, this.state.awayNumbers);
  }

  /** Clear the seen flag (for when numbers are regenerated). */
  public clearNumbersSeenFlag(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(this.seenKey());
    } catch {
      // localStorage not available
    }
  }

  /** Initialize display numbers if not already set (before checking animation). */
  public initDisplayNumbers(): void {
    if (this.displayHomeNumbers().length === 0) this.showStoredNumbers();
  }

  /**
   * Play the number draw, the same one How to play's sample game uses: the drawn numbers show at once and each
   * digit rises into place (.qs-draw-digit in styles.scss), the top row left to right, then the side top to bottom.
   */
  public playNumberRevealAnimation(finalHome: (number | null)[], finalAway: (number | null)[]): void {
    this.stopAnimation();
    this.displayHomeNumbers.set([...finalHome]);
    this.displayAwayNumbers.set([...finalAway]);
    this.markNumbersSeen();
    if (!isPlatformBrowser(this.platformId) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.isAnimatingNumbers.set(true);
    this.drawTimer = setTimeout(() => this.stopAnimation(), numberDrawMs(finalHome.length + finalAway.length));
  }

  /** The board on screen is going away: show no numbers until the next one arrives. */
  public reset(): void {
    this.displayHomeNumbers.set([]);
    this.displayAwayNumbers.set([]);
  }

  /** Show the stored numbers without a draw. */
  public showStoredNumbers(): void {
    this.displayHomeNumbers.set([...this.state.homeNumbers]);
    this.displayAwayNumbers.set([...this.state.awayNumbers]);
  }

  public stopAnimation(): void {
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
      this.drawTimer = null;
    }
    this.isAnimatingNumbers.set(false);
  }

  // Private properties

  private drawTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly state: GameStateService = inject(GameStateService);

  // Private functions

  /** Whether this browser has already seen the number reveal for this set of numbers. */
  private hasSeenNumbers(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    try {
      const stored = localStorage.getItem(this.seenKey());
      if (!stored) return false;
      const data = JSON.parse(stored);
      // Compare stored numbers with current to detect re-generation
      return JSON.stringify(data.home) === JSON.stringify(this.state.homeNumbers) &&
             JSON.stringify(data.away) === JSON.stringify(this.state.awayNumbers);
    } catch {
      return false;
    }
  }

  /** Mark that this browser has seen the current numbers. */
  private markNumbersSeen(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.seenKey(), JSON.stringify({
        home: this.state.homeNumbers,
        away: this.state.awayNumbers
      }));
    } catch {
      // localStorage not available
    }
  }

  private seenKey(): string {
    return `qs-numbers-seen-${this.state.gameId}`;
  }
}
