import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';

/** Open modals, oldest first. Only the last one answers Esc, so a confirm on top of a dialog closes alone. */
const openModals: ModalComponent[] = [];
/** The page's overflow before the first modal opened. Locked on <html>: the stylesheet makes <html> the scroller, so locking <body> does nothing. */
let pageOverflow = '';

const LEVEL = { 1: 'z-[150]', 2: 'z-[160]', 3: 'z-[170]' } as const;
const SIZE = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' } as const;
const PHONE = {
  /* Edge to edge on phones: full width, flush with the bottom, no overlay showing beside or below it. */
  sheet: { overlay: 'items-end pt-4 sm:items-center sm:p-4', panel: 'rounded-t-[18px] pb-[env(safe-area-inset-bottom)] max-sm:border-x-0 max-sm:border-b-0 sm:rounded-card' },
  center: { overlay: 'items-center p-4', panel: 'rounded-card' },
  full: { overlay: 'items-center p-4 max-sm:p-0', panel: 'rounded-card max-sm:h-dvh max-sm:rounded-none max-sm:border-0' }
} as const;
const FOCUSABLE = 'button, input, select, textarea, summary, [href], [tabindex]:not([tabindex="-1"])';

/**
 * The one dialog shell: overlay, panel, dialog semantics, focus (in, trapped, and back to where it was),
 * Esc and backdrop, and no page scrolling behind it. The content, including its header, is projected. Put `data-autofocus` on the element
 * that should take focus first; otherwise the first control does.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (shown()) {
      <div animate.enter="qs-modal-enter" [class]="overlayClass()" [class.qs-modal-leave]="!open()" (click)="onBackdrop()">
        <div
          [attr.role]="role()"
          aria-modal="true"
          [attr.aria-labelledby]="labelledBy()"
          [attr.aria-describedby]="describedBy()"
          [class]="panelClass()"
          (keydown.tab)="trapTab($event, false)"
          (keydown.shift.tab)="trapTab($event, true)"
          (click)="$event.stopPropagation()"
        >
          <ng-content></ng-content>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  open = input(false);
  labelledBy = input.required<string>();
  describedBy = input<string | null>(null);
  role = input<'dialog' | 'alertdialog'>('dialog');
  size = input<keyof typeof SIZE>('md');
  /** sheet: docked to the bottom on phones. center: centred. full: the whole screen on phones. */
  phone = input<keyof typeof PHONE>('sheet');
  /** 1 for a normal dialog; 2 or 3 when it opens over another one. Toasts and the tour sit above all of them. */
  level = input<keyof typeof LEVEL>(1);
  /** pop: the panel rises and fades in. slide: a sheet slides up from the bottom edge and back down. */
  motion = input<'pop' | 'slide'>('pop');
  /** Extra classes for the panel, for dialogs that set their own height or layout. */
  extraClass = input('');
  escapeCloses = input(true);
  backdropCloses = input(true);
  /** Esc or a backdrop tap asked to close. The owner decides and sets `open` to false. */
  dismissed = output<void>();

  protected overlayClass = computed(() => `fixed inset-0 flex justify-center bg-black/60 backdrop-blur-sm ${LEVEL[this.level()]} ${PHONE[this.phone()].overlay}${this.motion() === 'slide' ? ' qs-sheet-slide' : ''}`);
  protected panelClass = computed(() => `${this.motion() === 'slide' ? '' : 'animate-modal-in '}w-full border border-qs-line bg-qs-panel shadow-pop ${SIZE[this.size()]} ${PHONE[this.phone()].panel} ${this.extraClass()}`.trim());

  /** Stays true for the length of the exit fade, then drops on a timer. Not on animationend: a missed event would leave an invisible full-screen layer over the page. */
  protected shown = signal(false);
  private destroyRef = inject(DestroyRef);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus: HTMLElement | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.hideTimer));
    effect(() => {
      const open = this.open();
      clearTimeout(this.hideTimer);
      if (open) this.shown.set(true);
      else if (this.shown()) this.hideTimer = setTimeout(() => this.shown.set(false), this.motion() === 'slide' ? 190 : 150);
    });
    effect(onCleanup => {
      if (!this.open() || typeof document === 'undefined') return;
      openModals.push(this);
      if (openModals.length === 1) {
        pageOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      }
      this.returnFocus = document.activeElement as HTMLElement | null;
      const focusTimer = setTimeout(() => this.initialFocus());
      onCleanup(() => {
        clearTimeout(focusTimer);
        openModals.splice(openModals.indexOf(this), 1);
        if (!openModals.length) document.documentElement.style.overflow = pageOverflow;
        const target = this.returnFocus;
        this.returnFocus = null;
        setTimeout(() => target?.isConnected && target.focus());
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.escapeCloses() && openModals[openModals.length - 1] === this) this.dismissed.emit();
  }

  protected onBackdrop(): void {
    if (this.backdropCloses()) this.dismissed.emit();
  }

  protected trapTab(event: Event, back: boolean): void {
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (back && active === first) { event.preventDefault(); last.focus(); }
    else if (!back && active === last) { event.preventDefault(); first.focus(); }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(e => e.offsetParent !== null && !(e as HTMLButtonElement).disabled);
  }

  private initialFocus(): void {
    const preferred = this.host.nativeElement.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? this.focusables()[0])?.focus();
  }
}
