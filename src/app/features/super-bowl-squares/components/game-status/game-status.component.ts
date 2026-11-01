import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-status.component.html'
})
export class GameStatusComponent {
  @Input() selectedSquares: Record<string, string> = {};
  @Input() confirmedNames: Set<string> = new Set();
  @Input() statusLabel = 'Confirmed';

  get filledSquares(): number {
    return Object.keys(this.selectedSquares || {}).length;
  }

  get remainingSquares(): number {
    return 100 - this.filledSquares;
  }

  get totalPlayers(): number {
    return new Set(Object.values(this.selectedSquares || {})).size;
  }

  get confirmedCount(): number {
    const names = new Set(Object.values(this.selectedSquares || {}));
    let count = 0;
    names.forEach(name => {
      if (this.confirmedNames?.has(name)) count += 1;
    });
    return count;
  }
}
