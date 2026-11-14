import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { DashboardSearchService, SearchWhere } from '../../services/dashboard-search.service';

/**
 * The one field that searches the boards you host and joins a game by its code. Join shows inside it once the text is a real code.
 * Sits on its `.qs-search` box (`<div appDashboardSearchField>`): one on desktop, one in the phone bottom bar.
 */
@Component({
  selector: 'div[appDashboardSearchField]',
  imports: [NgIconComponent],
  templateUrl: './dashboard-search-field.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardSearchFieldComponent {
  /** The phone field stays out of the tab order while the bottom bar shows New board instead. */
  public readonly outOfTabOrder = computed<boolean>(() => this.where() === 'phone' && !this.search.searchOpen());
  public readonly where = input.required<SearchWhere>();

  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
}
