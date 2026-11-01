import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quarter-winners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quarter-winners.component.html',
  styleUrls: ['./quarter-winners.component.scss']
})
export class QuarterWinnersComponent {
  @Input() winners: { [key: string]: string } = {};
  @Input() playerColors: { [key: string]: string } = {};
  @Input() scores: { [key: string]: { home: number; away: number } } = {};
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';

  @Output() quarterClick = new EventEmitter<string>();

  getQuarterLabel(quarter: string): string {
    const quarterMap: { [key: string]: string } = {
      q1: '1st Quarter',
      q2: '2nd Quarter',
      q3: '3rd Quarter',
      q4: 'Final Score'
    };
    return quarterMap[quarter] || quarter;
  }

  hasAnyScores(): boolean {
    return Object.values(this.scores).some(score => 
      score.home > 0 || score.away > 0
    );
  }

  saturateColor(color: string): string {
    // Convert Tailwind class to HSL color
    if (color.includes('red')) return 'rgb(220 38 38)';
    if (color.includes('blue')) return 'rgb(37 99 235)';
    if (color.includes('green')) return 'rgb(22 163 74)';
    if (color.includes('yellow')) return 'rgb(202 138 4)';
    if (color.includes('purple')) return 'rgb(147 51 234)';
    if (color.includes('pink')) return 'rgb(219 39 119)';
    if (color.includes('indigo')) return 'rgb(79 70 229)';
    if (color.includes('orange')) return 'rgb(234 88 12)';
    if (color.includes('teal')) return 'rgb(13 148 136)';
    if (color.includes('cyan')) return 'rgb(6 182 212)';
    return 'rgb(203 213 225)'; // Default gray
  }
} 