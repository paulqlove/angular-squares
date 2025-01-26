import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SQUARES_PROBABILITIES } from '../../utils/probability.utils';

@Component({
  selector: 'app-probability-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Grid Container -->
      <div class="">
        <!-- Numbers row -->
        <div class="grid grid-cols-[auto_repeat(10,minmax(0,1fr))] gap-0.5">
          <!-- Empty cell for top-left corner -->
          <div class="w-8 h-8 sm:w-12 sm:h-12"></div>
          
          <!-- Top numbers (home) -->
          @for (num of homeNumbers; track num) {
            <div class="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center text-xs sm:text-sm font-medium text-heading">
              {{ num !== null ? num : '' }}
            </div>
          }
        </div>

        <!-- Grid rows -->
        @for (awayNum of awayNumbers; track awayNum; let row = $index) {
          <div class="grid grid-cols-[auto_repeat(10,minmax(0,1fr))] gap-0.5">
            <!-- Side number (away) -->
            <div class="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center text-xs sm:text-sm font-medium text-heading">
              {{ awayNum !== null ? awayNum : '' }}
            </div>
            
            <!-- Probability cells -->
            @for (homeNum of homeNumbers; track homeNum; let col = $index) {
              <div [class]="getCellClass(row, col)"
                   class="w-8 h-8 sm:w-12 sm:h-12 border border-input flex items-center justify-center text-[8px] sm:text-xs">
                {{ getProbability(row, col) }}%
              </div>
            }
          </div>
        }

        <!-- Source attribution -->
        <div class="mt-4 text-xs text-muted text-center">
          Source: <a href="https://www.eldo.co/super-bowl-squares-odds-probabilities-best-worst-numbers.html" 
                     target="_blank" 
                     class="text-blue-600 hover:underline">
            ELDORADO Super Bowl Squares Odds & Probabilities
          </a>
        </div>
      </div>
    </div>
  `
})
export class ProbabilityHeatmapComponent {
  @Input() homeNumbers: (number | null)[] = [];
  @Input() awayNumbers: (number | null)[] = [];
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';

  getProbability(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return '';
    }
    const key = `${this.awayNumbers[row]},${this.homeNumbers[col]}`;
    return SQUARES_PROBABILITIES[key]?.toFixed(1) || '0.0';
  }

  getCellClass(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return 'bg-card';
    }

    const prob = Number(this.getProbability(row, col));
    
    // Color scale based on probability
    if (prob >= 3.0) return 'bg-blue-200';
    if (prob >= 2.0) return 'bg-blue-100';
    if (prob >= 1.5) return 'bg-green-200';
    if (prob >= 1.0) return 'bg-green-100';
    if (prob >= 0.5) return 'bg-yellow-100';
    return 'bg-red-50';
  }
} 