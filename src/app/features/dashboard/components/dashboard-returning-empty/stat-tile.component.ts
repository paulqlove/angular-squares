import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One stat on an empty dashboard: a big mono value over a short label, like "2" / "Hosted this season".
 * A long value, like "February 14", shrinks to fit the tile's width instead of running past its edge.
 */
@Component({
  selector: 'div[appStatTile]',
  host: { class: 'qs-card flex h-24 flex-col justify-center gap-1.5 px-[18px] [container-type:inline-size]' },
  template: `
    <p class="qs-stat-value font-mono font-semibold leading-none tabular-nums text-qs-ink whitespace-nowrap"
      [style.--qs-stat-chars]="value().length">{{ value() }}</p>
    <p class="text-[15px] text-qs-muted">{{ label() }}</p>
  `,
  // JetBrains Mono letters are 0.6em wide; the tile's side padding is 18px each side
  styles: ['.qs-stat-value { font-size: min(30px, calc((100cqi - 36px) / (var(--qs-stat-chars) * 0.62))); }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatTileComponent {
  public readonly label = input.required<string>();
  public readonly value = input.required<string>();
}
