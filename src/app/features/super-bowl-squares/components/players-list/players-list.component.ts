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
} 