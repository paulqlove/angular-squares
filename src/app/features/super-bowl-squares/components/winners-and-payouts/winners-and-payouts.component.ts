import { DecimalPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/** Per-quarter score tiles: score, points, and the winner. */
@Component({
    selector: 'app-winners-and-payouts',
    imports: [DecimalPipe],
    templateUrl: './winners-and-payouts.component.html',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WinnersAndPayoutsComponent {
  @Input() winners: { [key: string]: string } = {};
  @Input() quarterPayouts: { [key: string]: number } = {};
  @Input() playerColors: { [key: string]: string } = {};
  @Input() totalPot: number = 0;
  @Input() scores: { [key: string]: { home: number; away: number } } = {};
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';

  @Output() quarterClick = new EventEmitter<string>();

  readonly quarters = ['q1', 'q2', 'q3', 'q4'];

  getQuarterLabel(quarter: string): string {
    const quarterMap: { [key: string]: string } = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Final' };
    return quarterMap[quarter] || quarter;
  }

  getQuarterPoints(quarter: string): number {
    return Math.round(this.totalPot * this.quarterPayouts[quarter] * 100) / 100;
  }

  hasScore(quarter: string): boolean {
    const score = this.scores[quarter];
    return !!score && (score.home > 0 || score.away > 0);
  }
}
