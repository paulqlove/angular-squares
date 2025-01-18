import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Score {
  home: number;
  away: number;
}

interface ScoreChangeEvent {
  quarter: string;
  scores: Score;
}

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './score-input.component.html',
  styleUrls: ['./score-input.component.scss']
})
export class ScoreInputComponent {
  @Input() quarter!: string;
  @Input() scores!: { home: number; away: number };
  @Input() homeTeam: string = 'Home';
  @Input() awayTeam: string = 'Away';
  @Output() scoreChange = new EventEmitter<{ quarter: string; scores: { home: number; away: number } }>();

  onScoreChange(): void {
    this.scoreChange.emit({
      quarter: this.quarter,
      scores: this.scores
    });
  }

  getQuarterLabel(): string {
    const quarterMap: { [key: string]: string } = {
      q1: '1st Quarter',
      q2: '2nd Quarter',
      q3: '3rd Quarter',
      q4: '4th Quarter'
    };
    return quarterMap[this.quarter] || this.quarter;
  }
} 