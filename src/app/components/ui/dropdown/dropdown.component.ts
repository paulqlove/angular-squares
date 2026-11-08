import { Component, ElementRef, HostListener, ChangeDetectionStrategy, inject, input, model, signal, computed } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown } from '@ng-icons/heroicons/outline';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

/** A small menu in the site's style, used instead of the browser's own select. */
@Component({
  selector: 'app-dropdown',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative inline-block">
      <button
        type="button"
        class="qs-label inline-flex min-h-9 items-center gap-1.5 rounded-[4px] px-3 text-qs-muted decoration-qs-accent underline-offset-4 transition-colors hover:text-qs-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent"
        [class.text-qs-ink]="open()"
        [class.underline]="open()"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="ariaLabel()"
        (click)="open.set(!open())"
      >
        @if (prefix()) { <span>{{ prefix() }}</span> }{{ currentLabel() }}
        <ng-icon name="heroChevronDown" class="text-xs transition-transform duration-150" [class.rotate-180]="open()" aria-hidden="true"></ng-icon>
      </button>
      @if (open()) {
        <div role="menu" class="animate-menu-in absolute right-0 z-30 mt-1.5 min-w-full w-max overflow-hidden rounded-inner border border-qs-line-strong bg-qs-panel p-1 shadow-pop">
          @for (o of options(); track o.value) {
            <button
              type="button"
              role="menuitemradio"
              [attr.aria-checked]="o.value === value()"
              class="qs-label flex min-h-11 w-full items-center gap-2 rounded-[4px] px-3 text-left transition-colors hover:bg-qs-panel-2 focus-visible:bg-qs-panel-2 focus-visible:outline-none"
              [class]="o.value === value() ? 'text-qs-accent' : 'text-qs-ink'"
              (click)="pick(o.value)"
            >
              <span class="flex w-4 shrink-0 justify-center">
                @if (o.value === value()) { <ng-icon name="heroCheck" class="text-base text-qs-accent" aria-hidden="true"></ng-icon> }
              </span>
              {{ o.label }}
            </button>
          }
        </div>
      }
    </div>
  `
})
export class DropdownComponent {
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
