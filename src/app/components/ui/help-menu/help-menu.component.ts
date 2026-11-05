import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroBookOpen, heroPlayCircle, heroQuestionMarkCircle, heroShare } from '@ng-icons/heroicons/outline';

/** Header "?" button. Opens a small menu; the guided tour only starts from its "Take the tour" item. */
@Component({
  selector: 'app-help-menu',
  imports: [RouterLink, NgIconComponent],
  providers: [provideIcons({ heroBookOpen, heroPlayCircle, heroQuestionMarkCircle, heroShare })],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    @keyframes menu-in { from { opacity: 0; transform: translateY(-4px); } }
    .animate-menu-in { animation: menu-in 120ms cubic-bezier(.2,.7,.2,1); }
    @media (prefers-reduced-motion: reduce) { .animate-menu-in { animation: none; } }
  `],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        aria-haspopup="true"
        aria-controls="help-menu"
        class="flex min-h-11 min-w-11 items-center justify-center rounded-btn p-2.5 text-qs-tile-muted transition-colors hover:bg-white/10 hover:text-qs-tile-ink"
        title="Help"
        aria-label="Help"
      >
        <ng-icon name="heroQuestionMarkCircle" class="text-2xl"></ng-icon>
      </button>

      @if (open()) {
        <div
          id="help-menu"
          class="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-qs-line bg-qs-panel p-2 text-qs-ink shadow-pop animate-menu-in"
        >
          <button type="button" (click)="open.set(false); tour.emit()" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink">
            <ng-icon name="heroPlayCircle" class="text-base"></ng-icon>
            Take the tour
          </button>
          @if (showShare) {
            <button type="button" (click)="open.set(false); share.emit()" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink">
              <ng-icon name="heroShare" class="text-base"></ng-icon>
              Share this game
            </button>
          }
          <a routerLink="/how-to-play" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink">
            <ng-icon name="heroBookOpen" class="text-base"></ng-icon>
            How to play
          </a>
          <a routerLink="/faq" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink">
            <ng-icon name="heroQuestionMarkCircle" class="text-base"></ng-icon>
            FAQ
          </a>
        </div>
      }
    </div>
  `
})
export class HelpMenuComponent {
  /** Only the game page has something to share. */
  @Input() showShare = false;
  @Output() share = new EventEmitter<void>();
  @Output() tour = new EventEmitter<void>();

  open = signal(false);

  private host = inject(ElementRef<HTMLElement>);

  /** Closes on any click outside this menu, including a click on another menu's button. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open.set(!this.open());
  }
}
