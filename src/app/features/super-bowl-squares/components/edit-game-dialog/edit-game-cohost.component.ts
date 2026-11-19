import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass } from '@ng-icons/heroicons/outline';

import { GameGroup } from '../../../../core/utils/game-groups';
import { emailShortName, isCoHostEmail } from '../../../../core/utils/group-cohost';

export interface CoHostCandidate {
  name: string;
  uid: string;
}

/**
 * Edit game's Co-host field, on the dashboard and the game page: the current co-host with Remove, or a search of the board's players.
 * With a group picked that has a co-host (K4): a game with none shows the group's, saved with the game; a game with
 * its own keeps it, with a line offering the group's instead.
 */
@Component({
  selector: 'app-edit-game-cohost',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroMagnifyingGlass })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <label for="edit-game-cohost" class="qs-label text-qs-muted">Co-host <span class="text-qs-muted">· Optional</span></label>
      @if (shownName()) {
        <div class="flex items-center gap-2 rounded-inner border border-qs-accent bg-qs-panel p-3">
          <span class="flex-1 truncate font-semibold text-qs-ink">{{ shownName() }}</span>
          <button type="button" (click)="remove()" class="qs-btn qs-btn-secondary">Remove</button>
        </div>
        @if (fillFromGroup() && !coHostName()) {
          <p class="text-xs text-qs-muted">From {{ group()?.name }}. Saved with the game.</p>
        } @else if (offer(); as email) {
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0 truncate text-qs-muted">{{ group()?.name }}'s co-host is {{ email }}.</span>
            <button type="button" class="min-h-11 shrink-0 font-semibold text-qs-ink underline underline-offset-4" (click)="useGroup.emit(email)">Use {{ shortName(email) }}</button>
          </div>
        }
      } @else if (players().length > 0) {
        <div class="relative">
          <div class="qs-search">
            <ng-icon name="heroMagnifyingGlass" class="qs-search-icon" aria-hidden="true"></ng-icon>
            <input
              id="edit-game-cohost"
              type="text"
              [value]="query()"
              (input)="onInput($event)"
              (focus)="showResults.set(true)"
              (keydown)="onKeydown($event)"
              placeholder="Search players"
              autocomplete="off"
            />
          </div>
          @if (showResults() && results().length > 0) {
            <div class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-inner border border-qs-line bg-qs-panel shadow-pop">
              @for (player of results(); track player.uid; let i = $index) {
                <button
                  type="button"
                  (mousedown)="assign(player)"
                  (mouseenter)="index.set(i)"
                  class="min-h-11 w-full px-4 py-2 text-left text-qs-ink transition-colors"
                  [class]="i === index() ? 'bg-qs-accent-soft' : 'hover:bg-qs-panel-2'"
                >{{ player.name }}</button>
              }
            </div>
          }
        </div>
        <p class="text-xs text-qs-muted">A co-host can help manage players.</p>
      } @else {
        <p class="text-xs text-qs-muted">No players have joined yet. A co-host can help manage players.</p>
      }
    </div>
  `
})
export class EditGameCoHostComponent {
  /** Current co-host, empty for none. */
  public readonly coHostName = input<string>('');
  /** The current co-host's email, when they were typed by email. */
  public readonly coHostEmail = input<string>('');
  /** True while the picked group's co-host is shown for a game with none; Remove turns it off. Saved with the game. */
  public readonly fillFromGroup = model<boolean | undefined>(false);
  /** The group the picker is on, for its co-host. */
  public readonly group = input<GameGroup | undefined>(undefined);
  /** Players the host can pick as co-host. */
  public readonly players = input<CoHostCandidate[]>([]);
  public readonly assigned = output<CoHostCandidate>();
  public readonly removed = output<void>();
  /** Use the group's co-host (this email) on this game instead of its own. */
  public readonly useGroup = output<string>();

  protected readonly index = signal<number>(-1);
  /** The group's co-host email when this game has a different co-host of its own. */
  protected readonly offer = computed<string>(() => {
    const email = this.group()?.coHost?.email ?? '';
    return email && this.coHostName() && !isCoHostEmail({ managerEmail: this.coHostEmail() }, email) ? email : '';
  });
  protected readonly query = signal<string>('');
  protected readonly shortName = emailShortName;
  protected readonly shownName = computed<string>(() => this.coHostName() || (this.fillFromGroup() ? this.group()?.coHost?.email ?? '' : ''));
  protected readonly showResults = signal<boolean>(false);
  protected readonly results = computed<CoHostCandidate[]>(() => {
    const query = this.query().toLowerCase().trim();
    return query ? this.players().filter(p => p.name.toLowerCase().includes(query)) : this.players();
  });

  protected assign(player: CoHostCandidate): void {
    this.query.set('');
    this.showResults.set(false);
    this.assigned.emit(player);
  }

  protected remove(): void {
    if (this.coHostName()) this.removed.emit();
    else this.fillFromGroup.set(false);
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.showResults.set(true);
    this.index.set(-1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const results = this.results();
    if (event.key === 'Escape') {
      if (this.showResults()) event.stopPropagation();
      this.showResults.set(false);
    } else if (!results.length) {
      return;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.index.update(i => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.index.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const i = this.index();
      if (i >= 0 && i < results.length) this.assign(results[i]);
    }
  }
}
