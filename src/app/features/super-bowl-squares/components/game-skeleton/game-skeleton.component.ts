import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type SkeletonSize = 25 | 50 | 100;

const GRID_COLS: Record<SkeletonSize, string> = {
  25: 'grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(5,minmax(0,1fr))]',
  50: 'grid-cols-[2.25rem_repeat(10,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(10,minmax(0,1fr))]',
  100: 'grid-cols-[1.5rem_repeat(10,minmax(0,1fr))] sm:grid-cols-[2.25rem_repeat(10,minmax(0,1fr))]'
};

const FADE = '[mask-image:linear-gradient(to_bottom,#000_50%,transparent)]';

@Component({
  selector: 'app-game-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-skeleton.component.html'
})
export class GameSkeletonComponent {
  readonly fade = input(false);
  readonly size = input<SkeletonSize>(100);

  protected readonly boardClass = computed(() => (this.fade() ? FADE : ''));
  protected readonly colRange = computed(() => Array.from({ length: this.size() === 25 ? 5 : 10 }, (_, i) => i));
  protected readonly gridCols = computed(() => GRID_COLS[this.size()]);
  protected readonly rowRange = computed(() => Array.from({ length: this.size() === 100 ? 10 : 5 }, (_, i) => i));
  protected readonly playerNameWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-24'];
  protected readonly quarters = [0, 1, 2, 3];
}
