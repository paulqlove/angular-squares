import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SPORT_CONFIG, type EspnGame, type SportType } from '../core/services/espn.service';
import { formatGameDay, formatGameTime } from '../core/utils/espn-game-display';
import { getTeamLogoByAbbreviation } from '../features/content/teams-data';

interface TeamRow {
  abbr: string;
  name: string;
  logo: string | null;
  color: string | null;
  score: number;
}

/**
 * One game in a picker: kickoff time and day on top, then one row per team (away first).
 * Each team shows ESPN's logo, else our NFL logo, else a bar in the team's colour, else a neutral bar.
 * The parent owns the button, its click and the selected outline.
 */
@Component({
  selector: 'app-game-pick-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between gap-2 border-b border-dashed border-qs-line pb-2 font-mono text-xs text-qs-muted">
      @if (game.status === 'in') {
        <span class="flex items-center gap-1.5 font-medium uppercase text-qs-live"><span class="h-2 w-2 rounded-full bg-qs-live-fill motion-safe:animate-pulse" aria-hidden="true"></span>Live · {{ periodLabel }}{{ game.period }} {{ game.clock }}</span>
      } @else if (game.status === 'post') {
        <span class="uppercase">Final</span>
      } @else {
        <span>{{ game.date ? time() : 'TBD' }}</span>
      }
      @if (game.date && game.status === 'pre') {
        <span>{{ day() }}</span>
      }
    </div>
    @for (team of teams(); track $index) {
      <div class="flex min-w-0 items-center gap-2.5 pt-2">
        @if (team.logo) {
          <img [src]="team.logo" alt="" width="24" height="24" loading="lazy" class="h-6 w-6 shrink-0 object-contain" />
        } @else {
          <span class="h-5 w-[5px] shrink-0 rounded-full shadow-[0_0_0_1px_var(--qs-bar-edge)]" [class.bg-qs-line-strong]="!team.color" [style.background-color]="team.color" aria-hidden="true"></span>
        }
        <span class="font-semibold text-qs-ink" [class.text-lg]="large">{{ team.abbr }}</span>
        @if (game.status === 'pre') {
          <span class="ml-auto truncate text-sm text-qs-muted">{{ team.name }}</span>
        } @else {
          <span class="ml-auto font-mono text-sm font-medium text-qs-ink">{{ team.score }}</span>
        }
      </div>
    }
  `
})
export class GamePickCardComponent {
  @Input({ required: true }) game!: EspnGame;
  /** The board's sport; our own logo table covers the NFL only. */
  @Input() sport: string | undefined = '';
  /** Bigger team abbreviations, for the roomier create form. */
  @Input() large = false;

  get periodLabel(): string {
    return SPORT_CONFIG[this.sport as SportType]?.periodLabel ?? 'Q';
  }

  time(): string {
    return formatGameTime(this.game.date);
  }

  day(): string {
    return formatGameDay(this.game.date);
  }

  teams(): TeamRow[] {
    const g = this.game;
    const row = (abbr: string, full: string, name: string | undefined, logo: string | undefined, color: string | undefined, score: number): TeamRow => ({
      abbr,
      name: name || (full !== abbr ? full : ''),
      logo: logo || (this.sport === 'nfl' ? getTeamLogoByAbbreviation(abbr, 100) : null),
      color: color || null,
      score
    });
    return [
      row(g.awayTeam, g.awayTeamFull, g.awayName, g.awayLogo, g.awayColor, g.awayScore),
      row(g.homeTeam, g.homeTeamFull, g.homeName, g.homeLogo, g.homeColor, g.homeScore)
    ];
  }
}
