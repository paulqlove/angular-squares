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
  @Input() paidPlayers: Set<string> = new Set();
  @Input() homeNumbers: (number | null)[] = [];
  @Input() awayNumbers: (number | null)[] = [];
  @Input() selectedSquares: { [key: string]: string } = {};
  
  selectedPlayer: string | null = null;

  private shameEmojis = ['🤢', '🤮', '💩', '🙈', '😱', '🤦', '😤', '🫣', '🤑', '🗑️'];
  private shameLabels = ['Mooch', 'Shame!', 'Pay Up', 'Freeloader'];
  private playerEmojis: Map<string, string> = new Map();
  private playerShameLabels: Map<string, string> = new Map();

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

  get unpaidPlayers(): string[] {
    return Object.keys(this.playerStats)
      .filter(player => !this.paidPlayers.has(player));
  }

  get lastUnpaidPlayers(): string[] {
    return this.totalPlayers >= 9 ? 
      (this.unpaidPlayers.length <= 3 ? this.unpaidPlayers : []) : 
      [];
  }

  shouldShowShame(player: string): boolean {
    return this.lastUnpaidPlayers.includes(player);
  }

  getShameEmoji(player: string): string {
    if (!this.playerEmojis.has(player)) {
      const randomIndex = Math.floor(Math.random() * this.shameEmojis.length);
      this.playerEmojis.set(player, this.shameEmojis[randomIndex]);
    }
    return this.playerEmojis.get(player) || '🤢';
  }

  getShameLabel(player: string): string {
    if (!this.playerShameLabels.has(player)) {
      const randomIndex = Math.floor(Math.random() * this.shameLabels.length);
      this.playerShameLabels.set(player, this.shameLabels[randomIndex]);
    }
    return this.playerShameLabels.get(player) || 'Pay Up';
  }
} 