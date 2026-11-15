import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SheetDragDirective } from './sheet-drag.directive';

@Component({
  imports: [SheetDragDirective],
  template: `
    <button id="board" type="button" (click)="boardClicks = boardClicks + 1">square</button>
    <div #backdrop id="backdrop" style="background-color: rgba(0, 0, 0, 0.6)">
      <div id="sheet" [appSheetDrag]="true" [sheetBackdrop]="backdrop" (swipeClosed)="closes = closes + 1">
        <button id="inside" type="button" (click)="insideClicks = insideClicks + 1">Done</button>
      </div>
    </div>
  `
})
class Host {
  boardClicks = 0;
  closes = 0;
  insideClicks = 0;
}

/** jsdom has no matchMedia: report a phone, with motion allowed. */
const media = (query: string): MediaQueryList => ({ matches: query.includes('max-width') } as MediaQueryList);

describe('SheetDragDirective', () => {
  const realMatchMedia = window.matchMedia;
  let fixtures: { destroy(): void; nativeElement: HTMLElement }[] = [];
  let time = 0;

  beforeEach(() => {
    time = 0;
    window.matchMedia = media;
  });
  // A swipe keeps swallowing clicks for a moment; let it lapse so it can't reach the next test.
  afterEach(async () => {
    window.matchMedia = realMatchMedia;
    for (const f of fixtures) { f.nativeElement.remove(); f.destroy(); }
    fixtures = [];
    await new Promise(r => setTimeout(r, 400));
  });

  const setup = () => {
    const fixture = TestBed.createComponent(Host);
    fixtures.push(fixture);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    el('sheet').getBoundingClientRect = () => ({ height: 400 } as DOMRect);
    return { fixture, el };
  };

  /** One pointer event at `y`, `ms` after the previous one. */
  const pointer = (target: HTMLElement, type: string, y: number, ms = 16, pointerType = 'touch') => {
    time += ms;
    const event = new PointerEvent(type, { bubbles: true, clientX: 100, clientY: y, isPrimary: true, pointerId: 1, pointerType });
    Object.defineProperty(event, 'timeStamp', { value: time });
    target.dispatchEvent(event);
  };

  /** Presses at y 100, moves down by `to` in steps of `step` ms each, and lets go. */
  const drag = (target: HTMLElement, to: number, step = 16, pointerType = 'touch') => {
    pointer(target, 'pointerdown', 100, 0, pointerType);
    for (let dy = 10; dy <= to; dy += 10) pointer(target, 'pointermove', 100 + dy, step, pointerType);
    pointer(target, 'pointerup', 100 + to, step, pointerType);
  };

  it('closes when dragged past 30% of the sheet', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 200, 100);
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('closes on a quick flick, however short', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 60, 5);
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('snaps back from a short, slow drag', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 60, 100);
    expect(fixture.componentInstance.closes).toBe(0);
    expect(el('sheet').style.transform).toBe('translateY(0)');
  });

  it('swallows the click after a drag, in the sheet and on the board underneath', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 200, 100);
    el('inside').click();
    el('board').click();
    expect(fixture.componentInstance.insideClicks).toBe(0);
    expect(fixture.componentInstance.boardClicks).toBe(0);
  });

  it('swallows the click after a press that moved more than 10px, even with no close', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 20, 100);
    el('inside').click();
    expect(fixture.componentInstance.insideClicks).toBe(0);
  });

  it('lets a tap through', () => {
    const { fixture, el } = setup();
    pointer(el('inside'), 'pointerdown', 100, 0);
    pointer(el('inside'), 'pointermove', 106);
    pointer(el('inside'), 'pointerup', 106);
    el('inside').click();
    expect(fixture.componentInstance.insideClicks).toBe(1);
    expect(fixture.componentInstance.closes).toBe(0);
  });

  it('ignores a mouse', () => {
    const { fixture, el } = setup();
    drag(el('inside'), 200, 100, 'mouse');
    expect(fixture.componentInstance.closes).toBe(0);
    expect(el('sheet').style.transform).toBe('');
  });

  it('does nothing from 640px up', () => {
    window.matchMedia = () => ({ matches: false } as MediaQueryList);
    const { fixture, el } = setup();
    drag(el('inside'), 200, 100);
    expect(fixture.componentInstance.closes).toBe(0);
  });

  it('fades the backdrop toward 40% as the sheet moves', () => {
    const { el } = setup();
    pointer(el('inside'), 'pointerdown', 100, 0);
    pointer(el('inside'), 'pointermove', 115, 100);
    pointer(el('inside'), 'pointermove', 175, 100);
    expect(el('sheet').style.transform).toBe('translateY(60px)');
    expect(el('backdrop').style.backgroundColor).toBe('rgba(0, 0, 0, 0.42)');
  });

  it('snaps back when the finger stops before letting go, however fast the drag was', () => {
    const { fixture, el } = setup();
    pointer(el('inside'), 'pointerdown', 100, 0);
    for (let y = 120; y <= 160; y += 10) pointer(el('inside'), 'pointermove', y, 5);
    pointer(el('inside'), 'pointerup', 160, 500);
    expect(fixture.componentInstance.closes).toBe(0);
  });

  it('snaps back if the browser takes the touch', () => {
    const { fixture, el } = setup();
    pointer(el('inside'), 'pointerdown', 100, 0);
    pointer(el('inside'), 'pointermove', 150, 100);
    pointer(el('inside'), 'pointercancel', 150, 0);
    expect(fixture.componentInstance.closes).toBe(0);
    expect(el('sheet').style.transform).toBe('translateY(0)');
  });

  it('fades the sheet out in place with reduced motion, still following the finger', () => {
    window.matchMedia = () => ({ matches: true } as MediaQueryList);
    const { fixture, el } = setup();
    pointer(el('inside'), 'pointerdown', 100, 0);
    pointer(el('inside'), 'pointermove', 120, 100);
    pointer(el('inside'), 'pointermove', 200, 100);
    expect(el('sheet').style.transform).toBe('translateY(80px)');
    pointer(el('inside'), 'pointerup', 300, 100);
    expect(fixture.componentInstance.closes).toBe(1);
    expect(el('sheet').style.opacity).toBe('0');
    expect(el('sheet').style.transform).toBe('translateY(80px)');
  });
});
