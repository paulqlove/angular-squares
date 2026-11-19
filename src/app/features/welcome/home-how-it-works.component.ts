import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomeGridComponent } from './home-grid.component';
import { HomeGrid, winningCorner } from './home-grids';

interface Step {
  title: string;
  text: string;
}

/** Three numbered steps, each beside the piece of the app it describes. */
@Component({
  selector: 'app-home-how-it-works',
  imports: [HomeGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol class="max-w-[52rem]">
      @for (step of steps; track step.title; let i = $index) {
        <li class="grid gap-x-10 gap-y-4 border-t border-qs-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center">
          <div class="flex gap-4">
            <span class="qs-label pt-1 text-qs-muted" aria-hidden="true">0{{ i + 1 }}</span>
            <div>
              <h3 class="text-lg font-semibold text-qs-ink">{{ step.title }}</h3>
              <p class="qs-body mt-1 text-[1.0625rem] leading-[1.7]">{{ step.text }}</p>
            </div>
          </div>
          <div class="pl-9 sm:pl-0" aria-hidden="true">
            @switch (i) {
              @case (0) {
                <div class="flex gap-1 rounded-inner border border-qs-line bg-qs-panel p-1">
                  @for (size of sizes; track size) {
                    <span class="qs-label flex min-h-9 flex-1 items-center justify-center rounded-btn"
                          [class]="size === 100 ? 'bg-qs-ink text-qs-bg' : 'text-qs-muted'">{{ size }}</span>
                  }
                </div>
              }
              @case (1) {
                <p class="flex items-center justify-center rounded-btn border border-qs-line bg-qs-panel-2 py-3 font-mono text-2xl font-semibold tracking-[0.3em] text-qs-ink">K7Q2XM</p>
              }
              @default {
                <div class="flex items-center gap-4">
                  <div class="qs-canvas border border-qs-line p-3"><app-home-grid [grid]="corner" class="w-[6.5rem]"></app-home-grid></div>
                  <p class="qs-label text-qs-muted">Q1 winner</p>
                </div>
              }
            }
          </div>
        </li>
      }
    </ol>
  `
})
export class HomeHowItWorksComponent {
  public readonly corner: HomeGrid = winningCorner();
  public readonly sizes: number[] = [100, 50, 25];
  public readonly steps: Step[] = [
    { title: 'Create a board', text: 'Pick your teams and a board size. No sign-in to start.' },
    { title: 'Share the link', text: 'Send the game code or link to friends and family.' },
    { title: 'Play and win', text: 'Claim squares, watch the game, and see who wins each quarter.' }
  ];
}
