import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/** Generic helmet in a team's color with its initials. Stands in for team logos. */
@Component({
  selector: 'app-team-helmet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 124 104" [attr.width]="size" [attr.height]="size * 104 / 124" [attr.role]="label ? 'img' : null"
         [attr.aria-label]="label || null" [attr.aria-hidden]="label ? null : 'true'" class="block shrink-0">
      <g transform="translate(124 0) scale(-1 1)" [attr.stroke]="outline" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M26 50 C32 24 54 8 78 8 C102 8 118 28 118 52 C118 70 110 82 100 88 C90 88 80 98 66 98 C57 98 52 90 56 82 L48 58 Z"
              [attr.fill]="color" />
        <path d="M12 68 H50 M12 68 V92 H26 C36 92 44 86 50 76 M12 80 H56 M30 52 L38 80 M48 58 L30 80" fill="none" />
        <circle cx="72" cy="70" r="4.5" fill="none" />
      </g>
      <text x="41" y="49" text-anchor="middle" font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="25"
            [attr.fill]="ink">{{ initials }}</text>
    </svg>
  `
})
export class TeamHelmetComponent {
  @Input({ required: true }) color = '#0f172a';
  @Input({ required: true }) initials = '';
  @Input() label = '';
  @Input() outline = '#ffffff';
  @Input() size = 64;

  get ink(): string {
    const hex = this.color;
    const lum = (0.299 * parseInt(hex.slice(1, 3), 16) + 0.587 * parseInt(hex.slice(3, 5), 16) + 0.114 * parseInt(hex.slice(5, 7), 16)) / 255;
    return lum > 0.5 ? '#0f172a' : '#ffffff';
  }
}
