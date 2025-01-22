import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCog6Tooth } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroCog6Tooth })
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
            <!-- Settings content goes here -->
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  isSettingsOpen = false;

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
  }
} 