import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-card rounded-lg shadow p-4">
      <h2 class="text-heading text-lg font-bold mb-4">Game Status</h2>
      <div class="grid grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-default">{{ filledSquares }}</div>
          <div class="text-sm text-muted">Filled</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-default">{{ remainingSquares }}</div>
          <div class="text-sm text-muted">Remaining</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-default">{{ percentageFilled }}%</div>
          <div class="text-sm text-muted">Complete</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-default">{{ uniquePlayers }}</div>
          <div class="text-sm text-muted">Players</div>
        </div>
      </div>
    </div>
  `
})
export class GameStatusComponent {
  @Input() selectedSquares: { [key: string]: string } = {};
  
  get filledSquares(): number {
    return Object.keys(this.selectedSquares).length;
  }

  get remainingSquares(): number {
    return 100 - this.filledSquares;
  }

  get percentageFilled(): number {
    return Math.round((this.filledSquares / 100) * 100);
  }

  get uniquePlayers(): number {
    return new Set(Object.values(this.selectedSquares)).size;
  }
} 