import { Directive, ElementRef, HostListener, inject, signal } from '@angular/core';

/** Sticky header that slides away on scroll down and comes back on scroll up. */
@Directive({
  selector: '[appHeadroom]',
  host: {
    class: 'block sticky top-0 z-40 transition-transform duration-200 motion-reduce:transition-none',
    '[class.-translate-y-full]': 'hidden()',
    '(focusin)': 'hidden.set(false)'
  }
})
export class HeadroomDirective {
  public hidden = signal<boolean>(false);

  private el = inject(ElementRef<HTMLElement>);
  private lastY = 0;

  @HostListener('window:scroll')
  public onScroll(): void {
    const y = window.scrollY;
    const height = this.el.nativeElement.offsetHeight;
    if (Math.abs(y - this.lastY) < 4) return;
    const hasFocus = this.el.nativeElement.contains(document.activeElement);
    this.hidden.set(y > this.lastY && y > height && !hasFocus);
    this.lastY = y;
  }
}
