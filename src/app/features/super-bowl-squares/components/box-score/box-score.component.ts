import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EspnGame, SportType, SPORT_CONFIG } from '../../../../core/services/espn.service';

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
            <span translate="no" class="px-1.5 py-0.5 rounded text-xs"
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
            <button type="button" (click)="startEditing()" class="qs-btn qs-btn-primary">
              Update scores
            </button>
          } @else if (isOwner && editing) {
            <button type="button" (click)="saveScores()" class="qs-btn qs-btn-primary">
              Save
            </button>
            <button type="button" (click)="cancelEditing()" class="qs-btn qs-btn-ghost border-white/30">
              Cancel
            </button>
          }
        </div>
      </div>
      <table translate="no" class="w-full text-xs">
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
          @for (row of rows; track row.side) {
            <tr class="border-white/10" [class.border-b]="$first">
              <td class="py-1 font-semibold">
                <span class="flex items-center gap-1.5">
                  @if (row.logo; as logo) {
                    <img [src]="logo" [alt]="row.name" class="h-4 w-4 object-contain" />
                  }
                  {{ row.name }}
                </span>
              </td>
              @for (q of quarterKeys; track q; let i = $index) {
                <td class="py-1 text-center text-qs-tile-ink">
                  @if (editing) {
                    <input type="number" min="0" inputmode="numeric" [attr.aria-label]="row.name + ' ' + q.toUpperCase()" [(ngModel)]="editScores[q][row.side]" class="qs-input w-11 px-1 text-center" />
                  } @else {
                    {{ getScore(i, row.side) }}
                  }
                </td>
              }
              <td class="py-1 text-center font-bold text-qs-tile-ink">{{ editing ? editScores.q4[row.side] : getTotalScore(row.side) }}</td>
            </tr>
          }
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
  /** Team logos from TeamLogoService (our NFL table, or ESPN's logo for other leagues). */
  @Input() awayLogo: string | null = null;
  @Input() homeLogo: string | null = null;
  @Input() isOwner = false;
  @Output() scoresChange = new EventEmitter<ManualScores>();

  editing = false;
  editScores: ManualScores = {
    q1: { home: 0, away: 0 },
    q2: { home: 0, away: 0 },
    q3: { home: 0, away: 0 },
    q4: { home: 0, away: 0 }
  };

  readonly quarterKeys = ['q1', 'q2', 'q3', 'q4'] as const;

  get rows(): { side: 'away' | 'home'; name: string; logo: string | null }[] {
    return [
      { side: 'away', name: this.displayAwayTeam, logo: this.awayLogo },
      { side: 'home', name: this.displayHomeTeam, logo: this.homeLogo }
    ];
  }

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
    const clean = (q: { home: number; away: number }) => ({ home: q.home || 0, away: q.away || 0 });
    this.scoresChange.emit({ q1: clean(this.editScores.q1), q2: clean(this.editScores.q2), q3: clean(this.editScores.q3), q4: clean(this.editScores.q4) });
    this.editing = false;
  }
}
