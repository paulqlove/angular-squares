import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { calculateWinProbability } from '../../utils/probability.utils';
import { TooltipDirective } from '../../../../shared/directives/tooltip.directive';

interface PlayerStat {
  squares: number;
  total: number;
}

type PlayerEntry = {
  player: string;
  stats: PlayerStat;
  probability: number | null;
}

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss']
})
export class PlayersListComponent {
  @Input() playerStats!: { [key: string]: PlayerStat };
  @Input() playerColors!: { [key: string]: string };
  @Output() playerSelected = new EventEmitter<string | null>();
  @Input() confirmedNames: Set<string> = new Set();
  @Input() statusLabel = 'Confirmed';
  @Input() homeNumbers: (number | null)[] = [];
  @Input() awayNumbers: (number | null)[] = [];
  @Input() selectedSquares: { [key: string]: string } = {};

  selectedPlayer: string | null = null;

  onPlayerClick(player: string): void {
    if (this.selectedPlayer === player) {
      this.selectedPlayer = null;
    } else {
      this.selectedPlayer = player;
    }
    this.playerSelected.emit(this.selectedPlayer);
  }

  getPlayerEntries(): PlayerEntry[] {
    return Object.entries(this.playerStats).map(([player, stats]) => {
      const coordinates = Object.entries(this.selectedSquares)
        .filter(([_, name]) => name === player)
        .map(([key]) => {
          const [row, col] = key.split('-').map(Number);
          return [row, col] as [number, number];
        });

      const probability = calculateWinProbability(
        coordinates,
        this.homeNumbers,
        this.awayNumbers
      );

      return {
        player,
        stats,
        probability
      };
    });
  }

  get totalPlayers(): number {
    return Object.keys(this.playerStats).length;
  }
} 