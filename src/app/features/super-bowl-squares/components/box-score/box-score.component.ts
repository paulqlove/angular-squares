import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EspnGame, SportType, SPORT_CONFIG } from '../../../../core/services/espn.service';
import { getTeamLogoByAbbreviation } from '../../../content/teams-data';

export interface ManualScores {
  q1: { home: number; away: number };
  q2: { home: number; away: number };
  q3: { home: number; away: number };
  q4: { home: number; away: number };
}

@Component({
  selector: 'app-box-score',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-qs-tile rounded-inner p-3 text-qs-tile-ink">
      <div class="flex items-center justify-between text-xs mb-2">
        <span class="qs-label text-qs-tile-muted">{{ game ? 'ESPN' : 'Scoreboard' }}</span>
        <div class="flex items-center gap-2">
          @if (game) {
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
          } @else if (isOwner && !editing) {
            <button type="button" (click)="startEditing()" class="px-2 py-1 rounded text-xs font-medium bg-qs-accent text-qs-on-accent hover:bg-qs-accent-hover transition-colors">
              Update scores
            </button>
          } @else if (isOwner && editing) {
            <button type="button" (click)="saveScores()" class="px-2 py-1 rounded text-xs font-medium bg-qs-accent text-qs-on-accent hover:bg-qs-accent-hover transition-colors">
              Save
            </button>
            <button type="button" (click)="cancelEditing()" class="px-2 py-1 rounded text-xs font-medium border border-white/30 hover:bg-white/10 transition-colors">
              Cancel
            </button>
          }
        </div>
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
          <!-- Away team row -->
          <tr class="border-b border-white/10">
            <td class="py-1 font-semibold">
              <span class="flex items-center gap-1.5">
                @if (espnSport === 'nfl' && getTeamLogo(displayAwayTeam); as logo) {
                  <img [src]="logo" [alt]="displayAwayTeam" class="h-4 w-4 object-contain" />
                }
                {{ displayAwayTeam }}
              </span>
            </td>
            @if (editing) {
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q1.away" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q2.away" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q3.away" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q4.away" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1 font-bold text-white">{{ editScores.q4.away }}</td>
            } @else {
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(0, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(1, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(2, 'away') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(3, 'away') }}</td>
              <td class="text-center py-1 font-bold text-white">{{ getTotalScore('away') }}</td>
            }
          </tr>
          <!-- Home team row -->
          <tr>
            <td class="py-1 font-semibold">
              <span class="flex items-center gap-1.5">
                @if (espnSport === 'nfl' && getTeamLogo(displayHomeTeam); as logo) {
                  <img [src]="logo" [alt]="displayHomeTeam" class="h-4 w-4 object-contain" />
                }
                {{ displayHomeTeam }}
              </span>
            </td>
            @if (editing) {
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q1.home" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q2.home" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q3.home" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1"><input type="number" min="0" [(ngModel)]="editScores.q4.home" class="w-8 bg-white/10 rounded px-1 text-center text-qs-tile-ink" /></td>
              <td class="text-center py-1 font-bold text-white">{{ editScores.q4.home }}</td>
            } @else {
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(0, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(1, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(2, 'home') }}</td>
              <td class="text-center py-1 text-qs-tile-ink">{{ getScore(3, 'home') }}</td>
              <td class="text-center py-1 font-bold text-white">{{ getTotalScore('home') }}</td>
            }
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class BoxScoreComponent {
  @Input() game: EspnGame | null = null;
  @Input() espnSport: SportType = 'nfl';
  @Input() scores: ManualScores | null = null;
  @Input() homeTeam = '';
  @Input() awayTeam = '';
  @Input() isOwner = false;
  @Output() scoresChange = new EventEmitter<ManualScores>();

  editing = false;
  editScores: ManualScores = {
    q1: { home: 0, away: 0 },
    q2: { home: 0, away: 0 },
    q3: { home: 0, away: 0 },
    q4: { home: 0, away: 0 }
  };

  get displayHomeTeam(): string {
    return this.game?.homeTeam || this.homeTeam || 'Home';
  }

  get displayAwayTeam(): string {
    return this.game?.awayTeam || this.awayTeam || 'Away';
  }

  getScore(quarter: number, team: 'home' | 'away'): number {
    if (this.game) {
      return this.game.quarters[quarter]?.[team] ?? 0;
    }
    const key = `q${quarter + 1}` as keyof ManualScores;
    return this.scores?.[key]?.[team] ?? 0;
  }

  getTotalScore(team: 'home' | 'away'): number {
    if (this.game) {
      return team === 'home' ? this.game.homeScore : this.game.awayScore;
    }
    return this.scores?.q4?.[team] ?? 0;
  }

  getPeriodLabel(): string {
    return SPORT_CONFIG[this.espnSport]?.periodLabel || 'Q';
  }

  getTeamLogo(abbrev: string): string | null {
    return getTeamLogoByAbbreviation(abbrev, 100);
  }

  startEditing(): void {
    this.editScores = {
      q1: { ...this.scores?.q1 ?? { home: 0, away: 0 } },
      q2: { ...this.scores?.q2 ?? { home: 0, away: 0 } },
      q3: { ...this.scores?.q3 ?? { home: 0, away: 0 } },
      q4: { ...this.scores?.q4 ?? { home: 0, away: 0 } }
    };
    this.editing = true;
  }

  cancelEditing(): void {
    this.editing = false;
  }

  saveScores(): void {
    this.scoresChange.emit({
      q1: { home: this.editScores.q1.home || 0, away: this.editScores.q1.away || 0 },
      q2: { home: this.editScores.q2.home || 0, away: this.editScores.q2.away || 0 },
      q3: { home: this.editScores.q3.home || 0, away: this.editScores.q3.away || 0 },
      q4: { home: this.editScores.q4.home || 0, away: this.editScores.q4.away || 0 }
    });
    this.editing = false;
  }
}
