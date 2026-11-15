import { Injectable } from '@angular/core';

/**
 * Watches elements' widths with one ResizeObserver for the whole page, so a list of cards that each need their width
 * shares a single observer instead of starting one per card.
 */
@Injectable({ providedIn: 'root' })
export class WidthObserverService {
  /** Calls `onWidth` with the element's content width now and whenever it changes. Returns a function that stops it. */
  public observe(element: Element, onWidth: (width: number) => void): () => void {
    const observer = this.shared();
    if (!observer) return () => undefined;
    this.listeners.set(element, onWidth);
    observer.observe(element);
    return () => {
      this.listeners.delete(element);
      observer.unobserve(element);
    };
  }

  private readonly listeners = new Map<Element, (width: number) => void>();
  private observer: ResizeObserver | null = null;

  /** The one observer, made on first use in the browser; none on the server. */
  private shared(): ResizeObserver | null {
    if (!this.observer && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(entries => {
        for (const entry of entries) this.listeners.get(entry.target)?.(entry.contentRect.width);
      });
    }
    return this.observer;
  }
}
