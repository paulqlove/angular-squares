import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SampleBoardComponent } from './sample-board.component';
import { SAMPLE_PLAYERS, SAMPLE_STEPS, SamplePlayer } from './sample-game.data';

/**
 * First-time host: "What a game looks like", a made-up board with Live score, Players, Hot numbers and How it works.
 * From 1024px up the board fills the left column and the four tiles sit two by two beside it. On phones the board
 * runs full width, then Live score and Hot numbers side by side, then Players and How it works.
 */
@Component({
  selector: 'section[appSampleGame]',
  imports: [SampleBoardComponent],
  host: { 'aria-labelledby': 'sample-heading' },
  template: `
    <h2 id="sample-heading" class="qs-eyebrow">What a game looks like</h2>
    <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
      <div appSampleBoard class="col-span-2 lg:col-span-1 lg:row-span-2"></div>

      <div class="qs-card flex flex-col p-4 sm:p-6 lg:col-start-2 lg:row-start-1">
        <div class="flex justify-between gap-2 text-qs-muted"><p class="qs-label">Live score</p><p class="qs-label">Q2<span class="max-sm:hidden"> 7:42</span></p></div>
        <dl class="mb-5 mt-5 grid grid-cols-[1fr_auto] items-center gap-y-3 font-mono">
          <dt class="text-lg font-semibold sm:text-2xl">KC</dt><dd class="text-3xl font-semibold tabular-nums sm:text-4xl">14</dd>
          <dt class="text-lg font-semibold sm:text-2xl">BUF</dt><dd class="text-3xl font-semibold tabular-nums sm:text-4xl">10</dd>
        </dl>
        <p class="mt-auto flex justify-between gap-2 rounded-inner bg-qs-accent-soft px-3 py-1.5 font-mono text-sm text-qs-accent">
          <span>4 · 0 leads</span><span>AL</span>
        </p>
      </div>

      <div class="qs-card p-4 sm:p-6 lg:col-start-2 lg:row-start-2">
        <p class="qs-label text-qs-muted">Hot numbers</p>
        <p class="mt-5 flex gap-6 font-mono text-4xl font-semibold sm:gap-10 sm:text-5xl">@for (digit of hotNumbers; track digit) {<span>{{ digit }}</span>}</p>
        <p class="mt-4 text-qs-muted">Most common last digits in NFL scores</p>
      </div>

      <div class="qs-card col-span-2 p-4 sm:p-6 lg:col-span-1 lg:col-start-3 lg:row-start-1">
        <div class="flex justify-between text-qs-muted"><p class="qs-label">Players</p><p class="qs-label">12</p></div>
        <ul class="mt-4 space-y-3">
          @for (player of players; track player.name) {
            <li class="flex items-center gap-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold text-qs-tile" [class]="player.color">{{ player.initials }}</span>
              <span class="min-w-0 flex-1"><span class="block font-semibold">{{ player.name }}</span><span class="block text-sm text-qs-muted">{{ player.squares }} squares</span></span>
              <span class="text-sm text-qs-muted">{{ status(player) }}</span>
            </li>
          }
        </ul>
      </div>

      <div class="qs-card col-span-2 p-4 sm:p-6 lg:col-span-1 lg:col-start-3 lg:row-start-2">
        <p class="qs-label text-qs-muted">How it works</p>
        <ol class="mt-5 space-y-4">
          @for (step of steps; track $index) {
            <li class="flex gap-4"><span class="font-mono font-semibold">{{ $index + 1 }}</span><span>{{ step }}</span></li>
          }
        </ol>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleGameComponent {
  protected readonly hotNumbers: readonly number[] = [0, 7, 3];
  protected readonly players: readonly SamplePlayer[] = SAMPLE_PLAYERS;
  protected readonly steps: readonly string[] = SAMPLE_STEPS;

  protected status(player: SamplePlayer): string {
    return player.confirmed ? 'Confirmed' : 'Unconfirmed';
  }
}
