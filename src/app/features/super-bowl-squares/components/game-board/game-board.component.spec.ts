import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameBoardComponent } from './game-board.component';

@Component({
  imports: [GameBoardComponent],
  template: `
    <app-game-board homeTeam="KC" awayTeam="PHI" [homeNumbers]="home" [awayNumbers]="away" [selectedSquares]="{}"
      [playerColors]="{}" [isRandomized]="true" [drawing]="drawing()" />
  `
})
class Host {
  home = [3, 8, 0, 1, 2, 4, 5, 6, 7, 9];
  away = [5, 1, 9, 0, 2, 3, 4, 6, 7, 8];
  drawing = signal(false);
}

describe('GameBoardComponent number draw', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the numbers plainly when no draw is running', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.qs-draw-digit').length).toBe(0);
    expect(el.querySelector('[role="columnheader"]')!.textContent!.trim()).toBe('3');
  });

  it('rises each digit in, the top row first and then the side, like How to play', () => {
    const fixture = render();
    fixture.componentInstance.drawing.set(true);
    fixture.detectChanges();
    const digits = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.qs-draw-digit')];
    expect(digits.length).toBe(20);
    expect(digits.map(d => d.style.getPropertyValue('--i'))).toEqual(Array.from({ length: 20 }, (_, i) => String(i)));
    expect(digits[0].textContent).toBe('3');
    expect(digits[10].textContent).toBe('5');
  });
});
