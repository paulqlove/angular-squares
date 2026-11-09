import { TestBed } from '@angular/core/testing';
import { GameSkeletonComponent } from './game-skeleton.component';

describe('GameSkeletonComponent', () => {
  const render = (size: 25 | 50 | 100): HTMLElement => {
    const fixture = TestBed.createComponent(GameSkeletonComponent);
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    return fixture.nativeElement;
  };

  for (const [size, rows, cells] of [[25, 5, 25], [50, 5, 50], [100, 10, 100]] as const) {
    it(`draws ${rows} rows and ${cells} cells for ${size} squares`, () => {
      const el = render(size);
      expect(el.querySelector('[role="status"]')).toBeTruthy();
      expect(el.querySelectorAll('[data-cell]').length).toBe(cells);
      expect(el.querySelectorAll('.qs-skel.grid').length).toBe(rows);
    });
  }
});
