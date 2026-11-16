import { TestBed } from '@angular/core/testing';

import { GroupRow } from '../../../../core/utils/game-groups';
import { GroupMenuComponent } from './group-menu.component';

describe('GroupMenuComponent', () => {
  const rows: GroupRow[] = [{ id: 'mk', name: 'mk', createdAt: 1, count: 3 }];

  const setup = (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(GroupMenuComponent);
    fixture.componentRef.setInput('rows', rows);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    const picks: (string | null)[] = [];
    fixture.componentInstance.groupPicked.subscribe(id => picks.push(id));
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, picks };
  };

  it('puts an × beside a clearable pick that goes back to All groups without opening the menu', () => {
    const { el, picks } = setup({ clearable: true, pickedId: 'mk' });
    const clear = el.querySelector<HTMLButtonElement>('button[appGroupClear]')!;
    expect(clear.getAttribute('aria-label')).toBe('Showing mk. Show all groups');
    clear.click();
    expect(picks).toEqual([null]);
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });

  it('has no × with All groups picked, or where it is not clearable (TV mode)', () => {
    expect(setup({ clearable: true, pickedId: null }).el.querySelector('button[appGroupClear]')).toBeNull();
    expect(setup({ pickedId: 'mk' }).el.querySelector('button[appGroupClear]')).toBeNull();
  });

  it('does nothing from the × while off on the Players tab', () => {
    const { el, picks } = setup({ clearable: true, pickedId: 'mk', off: true });
    el.querySelector<HTMLButtonElement>('button[appGroupClear]')!.click();
    expect(picks).toEqual([]);
  });
});
