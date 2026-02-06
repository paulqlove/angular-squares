import { Component, Input } from '@angular/core';
import { EspnGame, SportType, SPORT_CONFIG } from '../../../../core/services/espn.service';

@Component({
  selector: 'app-box-score',
  standalone: true,
  template: `
    @if (game) {
      <div class="bg-gray-900 rounded-lg p-3 text-white">
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="text-gray-400">ESPN</span>
          <span class="px-1.5 py-0.5 rounded text-xs"
            [class.bg-yellow-500]="game.status === 'in'"
            [class.animate-pulse]="game.status === 'in'"
            [class.bg-green-600]="game.status === 'post'"
            [class.bg-gray-600]="game.status === 'pre'"
          >
            @if (game.status === 'pre') { Upcoming }
            @else if (game.status === 'in') { {{ getPeriodLabel() }}{{ game.period }} {{ game.clock }} }
            @else { Final }
          </span>
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700">
              <th class="text-left py-1 w-16"></th>
              <th class="text-center py-1 w-8">1</th>
              <th class="text-center py-1 w-8">2</th>
              <th class="text-center py-1 w-8">3</th>
              <th class="text-center py-1 w-8">4</th>
              <th class="text-center py-1 w-10 font-bold">T</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-800">
              <td class="py-1 font-semibold">{{ game.awayTeam }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(0, 'away') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(1, 'away') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(2, 'away') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(3, 'away') }}</td>
              <td class="text-center py-1 font-bold text-white">{{ game.awayScore }}</td>
            </tr>
            <tr>
              <td class="py-1 font-semibold">{{ game.homeTeam }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(0, 'home') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(1, 'home') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(2, 'home') }}</td>
              <td class="text-center py-1 text-gray-300">{{ getQuarterScore(3, 'home') }}</td>
              <td class="text-center py-1 font-bold text-white">{{ game.homeScore }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    } @else {
      <p class="text-sm text-muted text-center py-8">No ESPN game linked.</p>
    }
  `
})
export class BoxScoreComponent {
  @Input() game: EspnGame | null = null;
  @Input() espnSport: SportType = 'nfl';

  getQuarterScore(quarter: number, team: 'home' | 'away'): number {
    return this.game?.quarters[quarter]?.[team] ?? 0;
  }

  getPeriodLabel(): string {
    return SPORT_CONFIG[this.espnSport]?.periodLabel || 'Q';
  }
}
