import { Component, ChangeDetectionStrategy } from '@angular/core';

interface SampleClaim {
  name: string;
  color: string;
}

/**
 * Static illustration of a squares board for the welcome hero.
 * Not connected to Firebase and not a live game.
 */
@Component({
  selector: 'app-sample-board',
  standalone: true,
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      class="qs-card p-4 sm:p-5"
      role="img"
      aria-label="Sample football squares board with a few squares claimed">
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="qs-eyebrow qs-eyebrow-bar">Board 01 / Harbor vs Riverside</p>
        <span class="qs-badge">Sample</span>
      </div>
      <div class="qs-canvas p-3 sm:p-6">
      <div class="grid grid-cols-[1rem_repeat(10,minmax(0,1fr))] gap-px overflow-hidden rounded-inner bg-qs-line p-px shadow-card">
        <div class="bg-qs-panel-2"></div>
        @for (digit of homeDigits; track $index) {
          <div class="flex h-5 items-center justify-center bg-qs-tile font-mono text-[10px] font-medium text-qs-tile-ink sm:h-6 sm:text-[11px]">
            {{ digit }}
          </div>
        }
        @for (row of rows; track row) {
          <div class="flex items-center justify-center bg-qs-tile font-mono text-[10px] font-medium text-qs-tile-ink sm:text-[11px]">
            {{ awayDigits[row] }}
          </div>
          @for (col of rows; track col) {
            @if (claimAt(row, col); as claim) {
              <div
                class="flex aspect-square items-center justify-center truncate px-px text-[7px] font-semibold leading-none text-slate-900 sm:text-[9px]"
                [class]="claim.color">
                {{ claim.name }}
              </div>
            } @else {
              <div class="aspect-square bg-qs-panel"></div>
            }
          }
        }
        </div>
      </div>
    </div>
  `
})
export class SampleBoardComponent {
  readonly homeDigits: number[] = [4, 7, 1, 0, 9, 3, 6, 2, 8, 5];
  readonly awayDigits: number[] = [8, 2, 5, 9, 0, 6, 3, 7, 1, 4];
  readonly rows: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  private readonly claims: Record<string, SampleClaim> = {
    '0-2': { name: 'Alex', color: 'bg-red-200' },
    '1-4': { name: 'Sam', color: 'bg-blue-200' },
    '1-8': { name: 'Pat', color: 'bg-purple-200' },
    '2-2': { name: 'Alex', color: 'bg-red-200' },
    '2-7': { name: 'Jo', color: 'bg-amber-200' },
    '3-1': { name: 'Pat', color: 'bg-purple-200' },
    '4-4': { name: 'Sam', color: 'bg-blue-200' },
    '4-9': { name: 'Mia', color: 'bg-teal-200' },
    '5-0': { name: 'Lee', color: 'bg-pink-200' },
    '6-1': { name: 'Mia', color: 'bg-teal-200' },
    '6-5': { name: 'Cam', color: 'bg-orange-200' },
    '7-3': { name: 'Rio', color: 'bg-lime-200' },
    '8-0': { name: 'Lee', color: 'bg-pink-200' },
    '8-8': { name: 'Max', color: 'bg-green-200' },
    '9-6': { name: 'Nia', color: 'bg-fuchsia-200' }
  };

  claimAt(row: number, col: number): SampleClaim | null {
    return this.claims[`${row}-${col}`] ?? null;
  }
}
