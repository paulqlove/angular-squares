import { DecimalPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, effectiveQuarterShares } from '../../../../core/plans';
import { quarterLabel } from '../../../../core/utils/quarter-label';

/** Per-quarter score tiles: score, points, and the winner. */
@Component({
    selector: 'app-winners-and-payouts',
    imports: [DecimalPipe],
    templateUrl: './winners-and-payouts.component.html',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WinnersAndPayoutsComponent {
  @Input() winners: { [key: string]: string } = {};
  @Input() quarterPayouts: { q1: number; q2: number; q3: number; q4: number } = { q1: 0.2, q2: 0.2, q3: 0.2, q4: 0.4 };
  @Input() emptyQuarterRule: EmptyQuarterRule = DEFAULT_EMPTY_QUARTER_RULE;
  /** How many quarters are finished (the first N). Only a finished quarter can be empty. */
  @Input() completedQuarters = 0;
  @Input() playerColors: { [key: string]: string } = {};
  @Input() totalPot: number = 0;
  @Input() scores: { [key: string]: { home: number; away: number } } = {};
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';
  /** Q4 reads "Final" only once the game is over. */
  @Input() gameOver = false;

  @Output() quarterClick = new EventEmitter<string>();

  readonly quarters = ['q1', 'q2', 'q3', 'q4'];

  getQuarterLabel(quarter: string): string {
    return quarterLabel(quarter, this.gameOver);
  }

  getQuarterPoints(quarter: string): number {
    const shares = effectiveQuarterShares(this.quarterPayouts, this.emptyFlags(), this.emptyQuarterRule);
    return Math.round(this.totalPot * shares[quarter as keyof typeof shares] * 100) / 100;
  }

  /** A finished quarter whose winning square nobody holds. */
  isEmpty(quarter: string): boolean {
    return this.quarters.indexOf(quarter) < this.completedQuarters && !this.winners[quarter];
  }

  private emptyFlags(): { q1: boolean; q2: boolean; q3: boolean; q4: boolean } {
    return { q1: this.isEmpty('q1'), q2: this.isEmpty('q2'), q3: this.isEmpty('q3'), q4: this.isEmpty('q4') };
  }

  hasScore(quarter: string): boolean {
    const score = this.scores[quarter];
    return !!score && (score.home > 0 || score.away > 0);
  }
}
