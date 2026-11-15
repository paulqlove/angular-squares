import { TestBed } from '@angular/core/testing';

import { WidthObserverService } from './width-observer.service';

/** Stands in for ResizeObserver: counts how many get made and lets a test report sizes. */
class FakeResizeObserver {
  public static made: FakeResizeObserver[] = [];

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.made.push(this);
  }

  public readonly watched = new Set<Element>();

  public observe(element: Element): void {
    this.watched.add(element);
  }

  public report(element: Element, width: number): void {
    const entry = { target: element, contentRect: { width } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }

  public unobserve(element: Element): void {
    this.watched.delete(element);
  }
}

describe('WidthObserverService', () => {
  const real = globalThis.ResizeObserver;

  beforeEach(() => {
    FakeResizeObserver.made = [];
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = real;
  });

  it('shares one observer across every element and tells each its own width', () => {
    const widths = TestBed.inject(WidthObserverService);
    const a = document.createElement('div');
    const b = document.createElement('div');
    const seen: string[] = [];
    widths.observe(a, width => seen.push(`a ${width}`));
    widths.observe(b, width => seen.push(`b ${width}`));

    expect(FakeResizeObserver.made.length).toBe(1);
    FakeResizeObserver.made[0].report(b, 197);
    FakeResizeObserver.made[0].report(a, 288);
    expect(seen).toEqual(['b 197', 'a 288']);
  });

  it('stops watching an element once asked', () => {
    const widths = TestBed.inject(WidthObserverService);
    const a = document.createElement('div');
    const seen: number[] = [];
    const stop = widths.observe(a, width => seen.push(width));
    stop();

    expect(FakeResizeObserver.made[0].watched.has(a)).toBe(false);
    FakeResizeObserver.made[0].report(a, 300);
    expect(seen).toEqual([]);
  });
});
