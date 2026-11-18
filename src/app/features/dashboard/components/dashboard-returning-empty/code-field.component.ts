import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroHashtag } from '@ng-icons/heroicons/outline';

import { normalizeCodeInput } from '../../../../core/utils/game-code';
import { DashboardSearchService } from '../../services/dashboard-search.service';

/**
 * Phone, returning host with no boards: Got a game code? with its field and Join at the top of the page, while the
 * bottom bar holds only New board. Uses the dashboard's search-or-code field state, so joining works the same way.
 */
@Component({
  selector: 'div[appCodeField]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroHashtag })],
  template: `
    <label for="code-field-top" class="qs-label text-qs-muted">Got a game code?</label>
    <!-- The tour's join step rings the field and Join together -->
    <div class="mt-3 flex gap-2" role="search" data-walkthrough="join-game">
      <div class="qs-search min-w-0 flex-1">
        <ng-icon name="heroHashtag" class="qs-search-icon" aria-hidden="true"></ng-icon>
        <input id="code-field-top" type="text" placeholder="Game code" autocomplete="off" autocapitalize="characters" spellcheck="false"
          enterkeyhint="go" [value]="search.gameSearch()" (input)="setCode($any($event.target))"
          (keydown.enter)="search.onSearchEnter($event)" [attr.aria-invalid]="search.showCodeError() ? 'true' : null"
          [attr.aria-describedby]="search.showCodeError() ? 'code-error-top' : null" />
      </div>
      <button type="button" class="qs-btn qs-btn-secondary shrink-0" [disabled]="!search.codeCandidate()" (click)="search.onSearchEnter($event)">Join</button>
    </div>
    @if (search.showCodeError()) {
      <p id="code-error-top" class="qs-error-in mt-2 text-sm text-qs-bad" role="alert">Game not found</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeFieldComponent {
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);

  protected setCode(input: HTMLInputElement): void {
    this.search.onSearchInput(normalizeCodeInput(input));
  }
}
