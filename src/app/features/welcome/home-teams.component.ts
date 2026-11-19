import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NFL_TEAMS, NflTeam, getTeamLogo } from '../content/teams-data';

/**
 * Every NFL team as a flat square on the board stage, linking to its team page. Logos sit on paper so
 * none disappears into its own team color; the color runs along the bottom like an axis band.
 */
@Component({
  selector: 'app-home-teams',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="qs-canvas grid max-w-[44rem] grid-cols-4 gap-[3px] border border-qs-line p-4 sm:grid-cols-8">
      @for (team of teams; track team.slug) {
        <li>
          <a [routerLink]="'/team/' + team.slug" [attr.aria-label]="team.city + ' ' + team.name"
             class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-[3px] bg-qs-panel outline-offset-2">
            <img [src]="team.logo" alt="" width="48" height="48" loading="lazy" class="h-3/5 w-3/5 object-contain">
            <span class="absolute inset-x-0 bottom-0 h-1" [style.background]="team.primaryColor" aria-hidden="true"></span>
            <span translate="no" aria-hidden="true"
                  class="absolute inset-x-0 bottom-0 bg-qs-tile truncate px-1 py-1 text-center text-[11px] font-medium text-qs-tile-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              {{ team.name }}
            </span>
          </a>
        </li>
      }
    </ul>
  `
})
export class HomeTeamsComponent {
  public readonly teams: (NflTeam & { logo: string })[] = NFL_TEAMS.map(team => ({ ...team, logo: getTeamLogo(team, 100) }));
}
