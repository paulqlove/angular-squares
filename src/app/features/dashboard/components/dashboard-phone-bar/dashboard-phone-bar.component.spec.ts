import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../../../../core/services/toast.service';
import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { DashboardPhoneBarComponent } from './dashboard-phone-bar.component';

describe('DashboardPhoneBarComponent', () => {
  let groups: { pickedId: ReturnType<typeof signal<string | null>>; pickSheetOpen: ReturnType<typeof signal<boolean>> } & Record<string, unknown>;
  const setup = (pickedId: string | null = null) => {
    const off = () => false;
    const id = signal<string | null>(pickedId);
    const picked = computed(() => (id() === 'mk' ? { id: 'mk', name: 'mk' } : undefined));
    const pickSheetOpen = signal<boolean>(false);
    groups = { pickedId: id, picked, pickedName: computed(() => picked()?.name ?? 'All groups'), pickSheetOpen };
    TestBed.configureTestingModule({
      imports: [DashboardPhoneBarComponent],
      providers: [
        { provide: DashboardDialogsService, useValue: { isCheckingBoardLimit: off, openCreateModal: () => undefined } },
        { provide: DashboardGroupsService, useValue: groups },
        { provide: DashboardSearchService, useValue: { searchOpen: off, showCodeError: off, codeMatch: () => null, gameSearch: () => '' } },
        { provide: DashboardStore, useValue: { canCreateGame: () => true, groupPickerShows: () => true } },
        { provide: PlayersViewService, useValue: { active: off, search: () => '' } },
        { provide: ToastService, useValue: { show: () => undefined } }
      ]
    });
    const fixture = TestBed.createComponent(DashboardPhoneBarComponent);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, fixture };
  };

  // The plus used to lean on the dashboard's icon list; when it left that list the button kept an empty icon slot
  // and its words sat off to the right.
  it('draws the plus on New board by itself, so the words stay centered', () => {
    const button = setup().el.querySelector('[data-walkthrough="create-game"]')!;
    expect(button.textContent?.trim()).toBe('New board');
    expect(button.querySelector('ng-icon svg')).not.toBeNull();
  });

  it('shows the folder alone with no group picked', () => {
    const { el } = setup();
    expect(el.querySelector('[aria-label="Groups: All groups"]')?.textContent?.trim()).toBe('');
    expect(el.querySelector('button[appGroupClear]')).toBeNull();
  });

  it('names the picked group in the Groups button, with its own × that goes back to All groups', () => {
    const { el, fixture } = setup('mk');
    expect(el.querySelector('[aria-label="Groups: mk"]')?.textContent?.trim()).toBe('mk');
    const clear = el.querySelector<HTMLButtonElement>('button[appGroupClear]')!;
    expect(clear.getAttribute('aria-label')).toBe('Showing mk. Show all groups');
    clear.click();
    fixture.detectChanges();
    expect(groups.pickedId()).toBeNull();
    expect(groups.pickSheetOpen()).toBe(false);
    expect(el.querySelector('button[appGroupClear]')).toBeNull();
  });

  it('opens the Groups sheet from the name, not the ×', () => {
    const { el } = setup('mk');
    el.querySelector<HTMLButtonElement>('[aria-label="Groups: mk"]')!.click();
    expect(groups.pickSheetOpen()).toBe(true);
    expect(groups.pickedId()).toBe('mk');
  });
});
