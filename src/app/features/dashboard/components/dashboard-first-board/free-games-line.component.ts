import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** First-time host: how many free games this season, from the real season count, and a See Season Pass link. */
@Component({
  selector: 'div[appFreeGamesLine]',
  host: { class: 'flex flex-wrap items-center gap-x-5 gap-y-1' },
  template: `
    <p class="text-qs-muted">{{ left() }} free {{ left() === 1 ? 'game' : 'games' }} this season</p>
    <button type="button" (click)="seeSeasonPass.emit($event)"
      class="inline-flex min-h-11 items-center font-medium text-qs-ink underline decoration-1 underline-offset-[6px]">
      See Season Pass
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeGamesLineComponent {
  /** Free games left this season. */
  public readonly left = input.required<number>();
  /** The See Season Pass tap, to open the upgrade dialog. */
  public readonly seeSeasonPass = output<Event>();
}
