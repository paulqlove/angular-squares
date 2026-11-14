import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { DashboardViewService } from '../../services/dashboard-view.service';

/**
 * Grid or Compact cards: two borderless icon buttons at the right end of the list heading, from 640px up
 * (phones always show the compact row). Sits on its group (`<div appDashboardViewToggle>`).
 */
@Component({
  selector: 'div[appDashboardViewToggle]',
  imports: [NgIconComponent],
  templateUrl: './dashboard-view-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    /* Grid / Compact: borderless 44px icon buttons; muted at rest, panel-2 on hover, ink when pressed. Global focus ring. */
    .qs-view-btn { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: var(--qs-r-btn); color: var(--qs-muted);
      transition: background-color var(--qs-t-fast) var(--qs-ease), color var(--qs-t-fast) var(--qs-ease), transform var(--qs-t-fast) var(--qs-ease); }
    @media (hover: hover) { .qs-view-btn:hover:not([aria-pressed="true"]) { background: var(--qs-panel-2); color: var(--qs-ink); } }
    .qs-view-btn[aria-pressed="true"] { background: var(--qs-ink); color: var(--qs-bg); }
    .qs-view-btn:active { transform: scale(.97); transition-duration: var(--qs-t-press); transition-timing-function: var(--qs-ease-in); }
  `]
})
export class DashboardViewToggleComponent {
  protected readonly view: DashboardViewService = inject(DashboardViewService);
}
