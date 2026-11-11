import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEllipsisHorizontal } from '@ng-icons/heroicons/outline';

export interface CardMenuItem {
  id: string;
  label: string;
  danger?: boolean;
}

/** A "more actions" button with a small labelled menu. Items are text, so nothing depends on a tooltip. */
@Component({
  selector: 'app-card-menu',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroEllipsisHorizontal })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative">
      <button
        type="button"
        class="qs-btn qs-btn-ghost w-11 px-0 text-qs-muted hover:text-qs-ink"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="label()"
        (click)="toggle()"
      >
        <ng-icon name="heroEllipsisHorizontal" class="text-xl" aria-hidden="true"></ng-icon>
      </button>
      @if (open()) {
        <div role="menu" class="animate-menu-in absolute right-0 top-full z-30 mt-1.5 w-max min-w-40 overflow-hidden rounded-inner border border-qs-line-strong bg-qs-panel p-1 shadow-pop">
          @for (item of items(); track item.id) {
            <button
              type="button"
              role="menuitem"
              class="qs-label flex min-h-11 w-full items-center rounded-[4px] px-3 text-left transition-colors hover:bg-qs-panel-2 focus-visible:bg-qs-panel-2 focus-visible:outline-none"
              [class]="item.danger ? 'text-qs-bad' : 'text-qs-ink'"
              (click)="pick(item.id)"
            >{{ item.label }}</button>
          }
        </div>
      }
    </div>
  `
})
export class CardMenuComponent {
  items = input<CardMenuItem[]>([]);
  label = input('More actions');
  picked = output<string>();

  protected open = signal(false);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.host.nativeElement.querySelector('button')?.focus();
  }

  protected toggle(): void {
    this.open.update(v => !v);
    if (this.open()) setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
  }

  protected pick(id: string): void {
    this.open.set(false);
    this.picked.emit(id);
  }
}
