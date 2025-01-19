import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-bold mb-4">Game Status</h2>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-grey-600">{{ filledSquares }}</div>
          <div class="text-sm text-gray-600">Filled</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-grey-600">{{ remainingSquares }}</div>
          <div class="text-sm text-gray-600">Remaining</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-grey-600">{{ percentageFilled }}%</div>
          <div class="text-sm text-gray-600">Complete</div>
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
} 