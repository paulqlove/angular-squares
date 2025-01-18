import { Component, Input } from '@angular/core';
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

  getPlayerEntries(): PlayerEntry[] {
    return Object.entries(this.playerStats).map(([player, stats]) => ({
      player,
      stats
    }));
  }
} 