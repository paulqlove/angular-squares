import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../../../../core/services/toast.service';
import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { DashboardPhoneBarComponent } from './dashboard-phone-bar.component';

describe('DashboardPhoneBarComponent', () => {
  const setup = () => {
    const off = () => false;
    TestBed.configureTestingModule({
      imports: [DashboardPhoneBarComponent],
      providers: [
        { provide: DashboardDialogsService, useValue: { isCheckingBoardLimit: off, openCreateModal: () => undefined } },
        { provide: DashboardGroupsService, useValue: { picked: () => null, pickedName: () => 'All groups' } },
        { provide: DashboardSearchService, useValue: { searchOpen: off, showCodeError: off, codeMatch: () => null, gameSearch: () => '' } },
        { provide: DashboardStore, useValue: { canCreateGame: () => true, groupPickerShows: () => true } },
        { provide: PlayersViewService, useValue: { active: off, search: () => '' } },
        { provide: ToastService, useValue: { show: () => undefined } }
      ]
    });
    const fixture = TestBed.createComponent(DashboardPhoneBarComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  // The plus used to lean on the dashboard's icon list; when it left that list the button kept an empty icon slot
  // and its words sat off to the right.
  it('draws the plus on New board by itself, so the words stay centered', () => {
    const button = setup().querySelector('[data-walkthrough="create-game"]')!;
    expect(button.textContent?.trim()).toBe('New board');
    expect(button.querySelector('ng-icon svg')).not.toBeNull();
  });
});
