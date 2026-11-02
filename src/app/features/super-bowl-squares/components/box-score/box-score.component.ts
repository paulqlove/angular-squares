import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { EspnGame, SportType, SPORT_CONFIG } from '../../../../core/services/espn.service';

@Component({
  selector: 'app-box-score',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (game) {
      <div class="bg-qs-tile rounded-inner p-3 text-qs-tile-ink">
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="qs-label text-qs-tile-muted">ESPN</span>
          <span class="px-1.5 py-0.5 rounded text-xs"
            [class.bg-qs-live-fill]="game.status === 'in'"
            [class.text-qs-tile]="game.status === 'in'"
            [class.animate-pulse]="game.status === 'in'"
            [class.bg-qs-ok]="game.status === 'post'"
            [class.bg-white/10]="game.status === 'pre'"
          >
            @if (game.status === 'pre') { Upcoming }
            @else if (game.status === 'in') { {{ getPeriodLabel() }}{{ game.period }} {{ game.clock }} }
            @else { Final }
          </span>
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-qs-tile-muted border-b border-white/10">
              <th class="text-left py-1 w-16"></th>
              <th class="text-center py-1 w-8">1</th>
              <th class="text-center py-1 w-8">2</th>
              <th class="text-center py-1 w-8">3</th>
              <th class="text-center py-1 w-8">4</th>
              <th class="text-center py-1 w-10 font-bold">T</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-white/10">
              <td class="py-1 font-semibold">{{ game.awayTeam }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(0, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(1, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(2, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(3, 'away') }}</td>
              <td class="text-center py-1 font-bold text-white">{{ game.awayScore }}</td>
            </tr>
            <tr>
              <td class="py-1 font-semibold">{{ game.homeTeam }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(0, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(1, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(2, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getQuarterScore(3, 'home') }}</td>
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
