import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/** Generic helmet in a team's color with its initials. Stands in for team logos. */
@Component({
  selector: 'app-team-helmet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 128 96" [attr.width]="size" [attr.height]="size * 0.75" [attr.role]="label ? 'img' : null"
         [attr.aria-label]="label || null" [attr.aria-hidden]="label ? null : 'true'" class="block shrink-0">
      <path d="M16 66 C10 34 34 8 70 8 C98 8 116 28 116 50 L116 56 L94 56 C88 56 86 60 86 66 L86 80 C86 84 83 86 79 86 L36 86 C24 86 18 78 16 66 Z"
            [attr.fill]="color" [attr.stroke]="outline" stroke-width="3.5" stroke-linejoin="round" />
      <path d="M94 62 H122 M92 74 H122 M122 58 V82 M104 62 V82" fill="none" [attr.stroke]="outline" stroke-width="4" stroke-linecap="round" />
      <text x="54" y="58" text-anchor="middle" font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="27"
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
