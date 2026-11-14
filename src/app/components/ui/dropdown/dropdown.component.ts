import { Component, ElementRef, HostListener, ChangeDetectionStrategy, inject, input, model, signal, computed } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown } from '@ng-icons/heroicons/outline';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

/** A small menu in the site's style, used instead of the browser's own select. The picked row is ink (green is for open squares). */
@Component({
  selector: 'app-dropdown',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative" [class.inline-block]="!fill()">
      <button
        type="button"
        class="qs-label inline-flex items-center gap-1.5 rounded-[4px] px-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent"
        [class]="fill() ? 'min-h-11 w-full justify-between border bg-qs-panel-2 text-qs-ink ' + (open() ? 'border-qs-ink' : 'border-qs-line-strong') : 'min-h-9 text-qs-muted decoration-qs-accent underline-offset-4 hover:text-qs-ink hover:underline'"
        [class.text-qs-ink]="open()"
        [class.underline]="open() && !fill()"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="ariaLabel()"
        (click)="open.set(!open())"
      >
        <span class="truncate">@if (prefix()) { <span>{{ prefix() }}</span> }{{ currentLabel() }}</span>
        <ng-icon name="heroChevronDown" class="shrink-0 text-xs transition-transform duration-150" [class.rotate-180]="open()" aria-hidden="true"></ng-icon>
      </button>
      @if (open()) {
        <div role="menu" animate.enter="qs-menu-enter" animate.leave="qs-menu-leave" class="absolute z-30 mt-1.5 max-h-[60vh] min-w-full w-max max-w-[min(300px,calc(100vw-2rem))] overflow-y-auto rounded-inner border border-qs-line-strong bg-qs-panel p-1 shadow-pop" [class]="fill() && align() !== 'end' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'">
          @for (o of options(); track o.value) {
            <button
              type="button"
              role="menuitemradio"
              [attr.aria-checked]="o.value === value()"
              class="qs-label flex min-h-11 w-full items-center gap-2 rounded-[4px] px-3 text-left transition-colors hover:bg-qs-panel-2 focus-visible:bg-qs-panel-2 focus-visible:outline-none"
              [class.bg-qs-panel-2]="o.value === value()"
              (click)="pick(o.value)"
            >
              <span class="flex w-4 shrink-0 justify-center">
                @if (o.value === value()) { <ng-icon name="heroCheck" class="text-base" aria-hidden="true"></ng-icon> }
              </span>
              <span class="truncate">{{ o.label }}</span>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class DropdownComponent {
  /** 'end' lines the menu up with the button's right edge, for a button at the right of a row. */
  align = input<'auto' | 'end'>('auto');
  fill = input(false);
  ariaLabel = input<string>('');
  options = input<DropdownOption[]>([]);
  prefix = input<string>('');
  value = model<string>('');

  protected open = signal(false);
  protected currentLabel = computed(() => this.options().find(o => o.value === this.value())?.label ?? '');

  private host = inject(ElementRef<HTMLElement>);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  protected pick(value: string): void {
    this.value.set(value);
    this.open.set(false);
  }
}
