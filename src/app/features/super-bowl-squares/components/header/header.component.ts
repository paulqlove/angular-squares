import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroCog6Tooth, 
  heroTrash, 
  heroLockOpen, 
  heroLockClosed,
  heroArrowTopRightOnSquare 
} from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [
    provideIcons({ 
      heroCog6Tooth,
      heroTrash,
      heroLockOpen,
      heroLockClosed,
      heroArrowTopRightOnSquare
    })
  ],
  template: `
    <header class="bg-page shadow-sm relative">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-heading">Football Squares</h1>
        
        <div class="relative">
          <button class="w-12 h-12 flex items-center justify-center rounded-full bg-primary-100 hover:bg-primary-200 transition-colors"
                  (click)="toggleSettings()">
            <ng-icon name="heroCog6Tooth" class="text-2xl text-primary-600"></ng-icon>
          </button>
        </div>
      </div>

      <!-- Off-canvas menu -->
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200"
           [class.opacity-0]="!isSettingsOpen"
           [class.pointer-events-none]="!isSettingsOpen"
           (click)="closeSettings()">
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform duration-200"
             [class.translate-x-0]="isSettingsOpen"
             [class.translate-x-full]="!isSettingsOpen"
             (click)="$event.stopPropagation()">
          <div class="p-4">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold">Settings</h2>
              <button (click)="closeSettings()" class="text-gray-500 hover:text-gray-700">
                <span class="sr-only">Close menu</span>
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Game Controls -->
            <div class="space-y-4 mb-8">
              <button (click)="onRandomize.emit()" 
                      [disabled]="isLocked"
                      class="w-full bg-warm hover:bg-warm-hover text-white px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span *ngIf="!isRandomized">🎲</span>
                <ng-icon *ngIf="isRandomized" name="heroTrash" class="text-2xl"></ng-icon>
                {{ isRandomized ? 'Clear Numbers' : 'Randomize Numbers' }}
              </button>

              <button (click)="onToggleLock.emit()" 
                      class="w-full bg-control hover:bg-control-hover text-default px-4 py-2 rounded flex items-center justify-center gap-2">
                <ng-icon *ngIf="!isLocked" name="heroLockOpen" class="text-2xl"></ng-icon>
                <ng-icon *ngIf="isLocked" name="heroLockClosed" class="text-2xl"></ng-icon>
                {{ isLocked ? 'Unlock Game' : 'Lock Game' }}
              </button>
            </div>

            <!-- Venmo input -->
            <div class="mb-6">
              <label for="venmoUsername" class="block text-label text-sm font-medium mb-2">
                Venmo Username
              </label>
              <input
                type="text"
                id="venmoUsername"
                [ngModel]="venmoUsername"
                (ngModelChange)="onVenmoChange($event)"
                class="w-full px-3 py-2 bg-input border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-focus"
                placeholder="@username"
              />
              
              <div class="flex items-center justify-center gap-2 mt-3">
                <a
                  [href]="getVenmoLink()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-link hover:text-link-hover text-sm inline-flex items-center gap-1"
                  *ngIf="venmoUsername"
                >
                  Open Venmo Profile
                  <ng-icon 
                    name="heroArrowTopRightOnSquare" 
                    class="w-4 h-4"
                    aria-hidden="true">
                  </ng-icon>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input() isRandomized = false;
  @Input() isLocked = false;
  @Input() venmoUsername = '';
  @Output() onRandomize = new EventEmitter<void>();
  @Output() onToggleLock = new EventEmitter<void>();
  @Output() onVenmoUsernameChange = new EventEmitter<string>();
  
  isSettingsOpen = false;

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
  }

  getVenmoLink(): string {
    return `https://venmo.com/${this.venmoUsername.replace('@', '')}`;
  }

  onVenmoChange(username: string): void {
    this.venmoUsername = username;
    this.onVenmoUsernameChange.emit(username);
  }
} 