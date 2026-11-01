import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({ heroXMark })
  ],
  templateUrl: './payment-dialog.component.html'
})
export class PaymentDialogComponent {
  @Output() onPaidStatusChange = new EventEmitter<string[]>();

  isOpen = false;
  statusLabel = 'Confirmed';
  statusDescription = '';
  private playerStats: { [key: string]: { squares: number; total: number } } = {};
  private playerColors: { [key: string]: string } = {};
  private confirmedNames: Set<string> = new Set();

  setData(
    playerStats: { [key: string]: { squares: number; total: number } },
    playerColors: { [key: string]: string },
    confirmedNames: Set<string>,
    statusLabel = 'Confirmed',
    statusDescription = ''
  ) {
    this.playerStats = playerStats;
    this.playerColors = playerColors;
    this.confirmedNames = confirmedNames;
    this.statusLabel = statusLabel || 'Confirmed';
    this.statusDescription = statusDescription || '';
  }

  getPlayersList() {
    return Object.entries(this.playerStats).map(([name, stats]) => ({
      name,
      squares: stats.squares,
      color: this.tailwindToCss(this.playerColors[name]),
      confirmed: this.confirmedNames.has(name)
    }));
  }

  toggleConfirmed(playerName: string) {
    if (this.confirmedNames.has(playerName)) {
      this.confirmedNames.delete(playerName);
    } else {
      this.confirmedNames.add(playerName);
    }
    this.onPaidStatusChange.emit(Array.from(this.confirmedNames));
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  private tailwindToCss(color: string | undefined): string {
    if (!color) return '#cbd5e1';
    if (color.includes('red')) return '#fecaca';
    if (color.includes('blue')) return '#bfdbfe';
    if (color.includes('green')) return '#bbf7d0';
    if (color.includes('yellow')) return '#fef08a';
    if (color.includes('purple')) return '#e9d5ff';
    if (color.includes('pink')) return '#fbcfe8';
    if (color.includes('indigo')) return '#c7d2fe';
    if (color.includes('orange')) return '#fed7aa';
    if (color.includes('teal')) return '#99f6e4';
    if (color.includes('cyan')) return '#a5f3fc';
    if (color.includes('amber')) return '#fde68a';
    if (color.includes('lime')) return '#d9f99d';
    if (color.includes('sky')) return '#bae6fd';
    return '#cbd5e1';
  }
}
