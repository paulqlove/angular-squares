import { Component, Input } from '@angular/core';
import { GameListItem } from '../../core/services/game.service';

/** Owner-only card totals. Loaded with a dynamic import, never from a public template. */
@Component({
  selector: 'app-legacy-money-summary',
  standalone: true,
  template: `
    <div class="mb-4">
      <div class="flex justify-between gap-3 text-sm mb-1">
        <span class="text-muted">Collected</span>
        <span class="font-semibold text-default">\${{ game.collected }} / \${{ game.totalPot }}</span>
      </div>
      <div
        class="h-2 bg-control rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="percent"
        [attr.aria-label]="'Collected ' + game.collected + ' of ' + game.totalPot"
      >
        <div class="h-full bg-green-700 rounded-full" [style.width.%]="percent"></div>
      </div>
    </div>
  `
})
export class LegacyMoneySummaryComponent {
  @Input({ required: true }) game!: GameListItem;

  get percent(): number {
    if (!this.game?.totalPot) return 0;
    return Math.min(100, (this.game.collected / this.game.totalPot) * 100);
  }
}
