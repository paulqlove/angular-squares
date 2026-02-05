import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCreditCard } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-venmo-popover',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ heroCreditCard })],
  template: `
    <div class="relative">
      <button
        (click)="isOpen = !isOpen"
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#008CFF] hover:bg-[#0074D4] rounded-lg transition-colors"
      >
        <ng-icon name="heroCreditCard" class="text-lg"></ng-icon>
        <span>Pay</span>
      </button>

      <div *ngIf="isOpen" class="absolute right-0 top-full mt-2 bg-card rounded-lg shadow-lg border border-default p-4 w-56 z-50 space-y-3">
        <div class="flex items-center justify-center gap-2">
          <button (click)="copyUsername($event)" class="text-lg font-light text-default hover:text-[#008CFF] transition-colors">
            {{ username }}
          </button>
          <button (click)="copyUsername($event)" class="text-muted hover:text-default transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="text-center text-xs text-green-500 font-medium h-4">
          {{ copied ? 'Copied!' : '' }}
        </div>
        <button
          (click)="openVenmo($event)"
          class="block w-full px-3 py-2 text-center text-sm font-semibold text-white bg-[#008CFF] hover:bg-[#0074D4] rounded-lg transition-colors"
        >
          Open Venmo
        </button>
      </div>
    </div>
  `
})
export class VenmoPopoverComponent {
  @Input() username = '';

  isOpen = false;
  copied = false;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  copyUsername(event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard.writeText(this.username);
    this.copied = true;
    setTimeout(() => (this.copied = false), 1500);
  }

  openVenmo(event: MouseEvent): void {
    event.stopPropagation();
    window.open(`https://venmo.com/${this.username}`, '_blank');
    this.isOpen = false;
  }
}
