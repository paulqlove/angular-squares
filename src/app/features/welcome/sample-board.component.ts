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
      class="rounded-2xl border border-default bg-card p-3 shadow-sm sm:p-4"
      role="img"
      aria-label="Sample football squares board with a few squares claimed">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <p class="text-sm font-semibold text-heading">Chiefs vs Eagles</p>
        <p class="text-xs font-medium text-muted">Sample board</p>
      </div>
      <div class="grid grid-cols-[0.9rem_repeat(10,minmax(0,1fr))] gap-px overflow-hidden rounded-lg bg-[var(--color-grid-line)] p-px">
        <div class="bg-card"></div>
        @for (digit of homeDigits; track $index) {
          <div class="flex h-4 items-center justify-center bg-header text-[9px] font-semibold text-white sm:h-5 sm:text-[10px]">
            {{ digit }}
          </div>
        }
        @for (row of rows; track row) {
          <div class="flex items-center justify-center bg-header text-[9px] font-semibold text-white sm:text-[10px]">
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
              <div class="aspect-square bg-square"></div>
            }
          }
        }
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
    '8-8': { name: 'Max', color: 'bg-qs-accent-soft' },
    '9-6': { name: 'Nia', color: 'bg-fuchsia-200' }
  };

  claimAt(row: number, col: number): SampleClaim | null {
    return this.claims[`${row}-${col}`] ?? null;
  }
}
