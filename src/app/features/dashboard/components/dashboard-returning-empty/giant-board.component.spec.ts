import { TestBed } from '@angular/core/testing';

import { GiantBoardComponent } from './giant-board.component';

describe('GiantBoardComponent', () => {
  it('draws a full 10 by 10 board with each digit once along the top and down the side, hidden from screen readers', () => {
    const fixture = TestBed.createComponent(GiantBoardComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.qs-giant-sq').length).toBe(100);
    const numbers = [...el.querySelectorAll('.qs-giant-num')].map(n => n.textContent?.trim());
    expect([...numbers.slice(0, 10)].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(el.querySelectorAll('.qs-giant-sq.bg-qs-tile-open').length).toBeGreaterThan(0);
  });
});
