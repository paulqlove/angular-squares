import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PlayerStat {
  squares: number;
  total: number;
}

type PlayerEntry = {
  player: string;
  stats: PlayerStat;
}

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss']
})
export class PlayersListComponent {
  @Input() playerStats!: { [key: string]: PlayerStat };
  @Input() playerColors!: { [key: string]: string };
  @Output() playerSelected = new EventEmitter<string | null>();
  @Input() paidPlayers: Set<string> = new Set();
  
  selectedPlayer: string | null = null;

  private shameEmojis = ['🤢', '🤮', '💩', '🙈', '😱', '🤦', '😤', '🫣', '🤑', '🗑️'];
  private playerEmojis: Map<string, string> = new Map();

  onPlayerClick(player: string): void {
    if (this.selectedPlayer === player) {
      this.selectedPlayer = null;
    } else {
      this.selectedPlayer = player;
    }
    this.playerSelected.emit(this.selectedPlayer);
  }

  getPlayerEntries(): PlayerEntry[] {
    return Object.entries(this.playerStats).map(([player, stats]) => ({
      player,
      stats
    }));
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
} 