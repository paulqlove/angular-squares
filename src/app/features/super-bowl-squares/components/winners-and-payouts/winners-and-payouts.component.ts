import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-winners-and-payouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './winners-and-payouts.component.html'
})
export class WinnersAndPayoutsComponent {
  @Input() winners: { [key: string]: string } = {};
  @Input() quarterPayouts: { [key: string]: number } = {};
  @Input() playerColors: { [key: string]: string } = {};
  @Input() totalPot: number = 0;
  @Input() scores: { [key: string]: { home: number; away: number } } = {};

  ngOnChanges() {
    if (this.winners && this.totalPot) {
      Object.entries(this.winners).forEach(([quarter, winner]) => {
        const payout = this.totalPot * this.quarterPayouts[quarter];
      });
    }
  }

  getQuarters(): string[] {
    return Object.keys(this.quarterPayouts);
  }

  getQuarterLabel(quarter: string): string {
    const quarterMap: { [key: string]: string } = {
      q1: '1st Quarter',
      q2: '2nd Quarter',
      q3: '3rd Quarter',
      q4: '4th Quarter'
    };
    return quarterMap[quarter] || quarter;
  }

  getPayoutAmount(quarter: string): string {
    const percentage = this.quarterPayouts[quarter] * 100;
    return `${percentage}%`;
  }

  hasAnyScores(): boolean {
    return Object.values(this.scores).some(score => 
      score.home > 0 || score.away > 0
    );
  }
} 