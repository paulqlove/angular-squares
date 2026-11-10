import { DecimalPipe } from '@angular/common';
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { ModalComponent } from '../../../../components/ui/modal/modal.component';

import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroUserMinus, heroXMark } from '@ng-icons/heroicons/outline';

@Component({
    selector: 'app-payment-dialog',
    imports: [ModalComponent, FormsModule, NgIconComponent, DecimalPipe],
    providers: [
        provideIcons({ heroCheck, heroUserMinus, heroXMark })
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './payment-dialog.component.html'
})
export class PaymentDialogComponent {
  @Output() onPaidStatusChange = new EventEmitter<string[]>();
  @Output() playerRemoved = new EventEmitter<string>();

  isOpen = false;
  /** The player whose row is asking "Remove?"; the confirmation stays inside that row. */
  removingName: string | null = null;
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

  askRemove(playerName: string): void {
    this.removingName = playerName;
  }

  cancelRemove(): void {
    this.removingName = null;
  }

  confirmRemove(playerName: string): void {
    this.removingName = null;
    this.playerRemoved.emit(playerName);
  }

  confirmedCount(): number {
    return this.getPlayersList().filter(p => p.paid).length;
  }

  /** Esc or a backdrop tap: first back out of a remove prompt, then close. */
  onDismiss(): void {
    if (this.removingName) this.cancelRemove();
    else this.close();
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
    this.removingName = null;
  }
} 