import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerStats } from '../../types';

@Component({
  selector: 'app-game-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-status.component.html'
})
export class GameStatusComponent {
  @Input() selectedSquares!: Record<string, string>;
  @Input() playerStats!: Record<string, PlayerStats>;
  @Input() paidPlayers!: Set<string>;

  get filledSquares(): number {
    return Object.keys(this.selectedSquares).length;
  }

  get remainingSquares(): number {
    return 100 - this.filledSquares;
  }

  get percentComplete(): number {
    return Math.round((this.filledSquares / 100) * 100);
  }

  get totalPlayers(): number {
    return new Set(Object.values(this.selectedSquares)).size;
  }

  get totalCollected(): number {
    return Object.entries(this.playerStats)
      .filter(([player]) => this.paidPlayers.has(player))
      .reduce((sum, [_, stats]) => sum + stats.total, 0);
  }

  get totalOutstanding(): number {
    return Object.entries(this.playerStats)
      .filter(([player]) => !this.paidPlayers.has(player))
      .reduce((sum, [_, stats]) => sum + stats.total, 0);
  }

  get percentPaid(): number {
    const total = this.totalCollected + this.totalOutstanding;
    return total > 0 ? Math.round((this.totalCollected / total) * 100) : 0;
  }

  getFormattedAmount(value: number): string {
    return value.toFixed(2);
  }
} 