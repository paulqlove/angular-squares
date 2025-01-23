import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({ heroCheck, heroXMark })
  ],
  templateUrl: './payment-dialog.component.html'
})
export class PaymentDialogComponent {
  @Output() onPaidStatusChange = new EventEmitter<string[]>();
  
  isOpen = false;
  private playerStats: { [key: string]: { squares: number; total: number } } = {};
  private playerColors: { [key: string]: string } = {};
  private paidPlayers: Set<string> = new Set();

  setData(
    playerStats: { [key: string]: { squares: number; total: number } },
    playerColors: { [key: string]: string },
    paidPlayers: Set<string>
  ) {
    this.playerStats = playerStats;
    this.playerColors = playerColors;
    this.paidPlayers = paidPlayers;
  }

  getPlayersList() {
    return Object.entries(this.playerStats).map(([name, stats]) => ({
      name,
      squares: stats.squares,
      total: stats.total,
      color: this.playerColors[name],
      paid: this.paidPlayers.has(name)
    }));
  }

  togglePaidStatus(playerName: string) {
    if (this.paidPlayers.has(playerName)) {
      this.paidPlayers.delete(playerName);
    } else {
      this.paidPlayers.add(playerName);
    }
    this.onPaidStatusChange.emit(Array.from(this.paidPlayers));
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }
} 