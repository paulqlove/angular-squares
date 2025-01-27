import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroCog6Tooth, 
  heroTrash, 
  heroLockOpen, 
  heroLockClosed,
  heroArrowTopRightOnSquare,
  heroCreditCard,
  heroXMark
} from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { DialogComponent } from '../../../../components/ui/dialog/dialog.component';
import { PasswordDialogComponent } from '../../components/password-dialog/password-dialog.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule, ToggleComponent, DialogComponent, PasswordDialogComponent],
  providers: [
    provideIcons({ 
      heroCog6Tooth,
      heroTrash,
      heroLockOpen,
      heroLockClosed,
      heroArrowTopRightOnSquare,
      heroCreditCard,
      heroXMark
    })
  ],
  template: `
    <div class="relative">
      <header class="bg-page">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-heading">Football Squares</h1>
          <div class="flex items-center gap-2">
            <!-- Venmo Button -->
            @if (venmoUsername) {
              <button 
                (click)="showVenmoDialog = true"
                class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#008CFF] hover:bg-[#0074D4] rounded-lg transition-colors "
              >
                <ng-icon name="heroCreditCard" class="text-lg"></ng-icon>
                <span class="hidden sm:inline">Pay with Venmo</span>
              </button>
            }

            <!-- Settings Button -->
            <button 
              (click)="toggleSettings()"
              class="p-2 text-muted hover:text-heading rounded-lg hover:bg-card transition-colors"
            >
              <ng-icon name="heroCog6Tooth" class="text-2xl"></ng-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- Venmo Confirmation Dialog -->
      <app-dialog
        [isOpen]="showVenmoDialog"
        title="Leave Site?"
        [message]="venmoMessage"
        (onConfirm)="onVenmoConfirm()"
        (onCancel)="showVenmoDialog = false"
      ></app-dialog>

      <!-- Settings Panel -->
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200"
           [class.opacity-0]="!showSettings"
           [class.pointer-events-none]="!showSettings"
           (click)="closeSettings()">
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform duration-200 flex flex-col"
             [class.translate-x-0]="showSettings"
             [class.translate-x-full]="!showSettings"
             (click)="$event.stopPropagation()">
          
          <!-- Settings Header -->
          <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-lg font-bold text-heading">Settings</h2>
            <button (click)="closeSettings()" class="text-muted hover:text-heading">
              <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
            </button>
          </div>

          <!-- Settings Content -->
          <div class="flex-1 p-4 overflow-y-auto">
            <!-- Team Names -->
            <div class="space-y-4 mb-4">
              <div>
                <label for="awayTeam" class="block text-label text-sm font-medium mb-2">
                  Away Team
                </label>
                <input
                  type="text"
                  id="awayTeam"
                  [ngModel]="awayTeam"
                  (ngModelChange)="onTeamChange('away', $event)"
                  class="w-full px-3 py-2 bg-input border border-input rounded-md 
                         focus:outline-none focus:ring-2 
                         focus:ring-gradient-to-r focus:from-secondary-500 focus:via-secondary-600 focus:to-accent-600 
                         capitalize"
                  placeholder="Enter away team"
                />
              </div>
              
              <div>
                <label for="homeTeam" class="block text-label text-sm font-medium mb-2">
                  Home Team
                </label>
                <input
                  type="text"
                  id="homeTeam"
                  [ngModel]="homeTeam"
                  (ngModelChange)="onTeamChange('home', $event)"
                  class="w-full px-3 py-2 bg-input border border-input rounded-md 
                         focus:outline-none focus:ring-2 
                         focus:ring-gradient-to-r focus:from-secondary-500 focus:via-secondary-600 focus:to-accent-600 
                         capitalize"
                  placeholder="Enter home team"
                />
              </div>
            </div>

            <!-- Price Per Square -->
            <div class="mb-4">
              <label for="pricePerSquare" class="block text-label text-sm font-medium mb-2">
                Price Per Square
              </label>
              <div class="flex items-center gap-2">
                <span class="text-muted">$</span>
                <input
                  type="number"
                  id="pricePerSquare"
                  [ngModel]="pricePerSquare"
                  (ngModelChange)="handlePriceChange($event)"
                  [disabled]="isLocked"
                  class="w-full px-3 py-2 bg-input border border-input rounded-md 
                         focus:outline-none focus:ring-2 
                         focus:ring-gradient-to-r focus:from-secondary-500 focus:via-secondary-600 focus:to-accent-600 
                         disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

             <!-- Venmo input -->
            <div class="">
              <label for="venmoUsername" class="block text-label text-sm font-medium mb-2">
                Venmo Username
              </label>
              <div class="relative">
                <input
                  type="text"
                  id="venmoUsername"
                  [(ngModel)]="tempVenmoUsername"
                  (blur)="onVenmoBlur()"
                  [placeholder]="venmoUsername ? '@' + venmoUsername.replace('@', '') : '@username'"
                  class="w-full px-3 py-2 bg-input border border-input rounded-md 
                         focus:outline-none focus:ring-2 
                         focus:ring-gradient-to-r focus:from-secondary-500 focus:via-secondary-600 focus:to-accent-600"
                />
              </div>
              
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

            <!-- Add this before the Game Controls section -->
            <div class="mb-8">
              <div class="flex items-center justify-between p-4 rounded space-y-4">
                <span class="text-default">Lock Game</span>
                <app-toggle 
                [checked]="isLocked"
                (onChange)="onToggleLock.emit()"
                ></app-toggle>
              </div>
              </div>
              
              <!-- Game Controls -->
              <div class="space-y-4 mb-8">
              <button 
                (click)="onManagePayments.emit()"
                class="w-full bg-control hover:bg-control-hover text-default px-4 py-2 rounded flex items-center justify-center gap-2"
              >
                <ng-icon name="heroCreditCard" class="text-2xl"></ng-icon>
                Manage Payments
              </button>
              <button (click)="onRandomize.emit()" 
                      [disabled]="isLocked"
                      class="w-full px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                             bg-gradient-to-r from-secondary-500 via-secondary-600 to-accent-600 
                             hover:from-secondary-600 hover:via-secondary-700 hover:to-accent-700
                             text-white shadow-md hover:shadow-lg transition-all duration-200">
                <span *ngIf="!isRandomized">🎲</span>
                <ng-icon *ngIf="isRandomized" name="heroTrash" class="text-2xl"></ng-icon>
                {{ isRandomized ? 'Clear Numbers' : 'Randomize Numbers' }}
              </button>

           
            </div>

           
          </div>

          <!-- Footer with Clear Game button -->
          <div class="p-4 border-t border-gray-200 mt-auto">
            <button 
              (click)="onClearGame.emit(); closeSettings()"
              class="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded flex items-center justify-center gap-2"
            >
              <ng-icon name="heroTrash" class="text-2xl"></ng-icon>
              Clear Game
            </button>
            <p class="text-xs text-gray-500 text-center mt-2">
              This will reset all game data. Requires password.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add this at the end of the template -->
    <app-password-dialog #passwordDialog></app-password-dialog>
  `
})
export class HeaderComponent {
  @Input() isRandomized = false;
  @Input() isLocked = false;
  @Input() venmoUsername = '';
  @Input() homeTeam = '';
  @Input() awayTeam = '';
  @Input() pricePerSquare = 10;
  @Output() onRandomize = new EventEmitter<void>();
  @Output() onToggleLock = new EventEmitter<void>();
  @Output() onVenmoUsernameChange = new EventEmitter<string>();
  @Output() onTeamNameChange = new EventEmitter<{team: 'home' | 'away', name: string}>();
  @Output() onPriceChange = new EventEmitter<number>();
  @Output() onManagePayments = new EventEmitter<void>();
  @Output() onClearGame = new EventEmitter<void>();
  
  showSettings = false;
  showVenmoDialog = false;
  @ViewChild('passwordDialog') passwordDialog!: PasswordDialogComponent;
  tempVenmoUsername = '';

  ngOnInit() {
    this.tempVenmoUsername = this.venmoUsername || '';
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  getVenmoLink(): string {
    return `https://venmo.com/${this.venmoUsername.replace('@', '')}`;
  }

  async onVenmoBlur(): Promise<void> {
    if (this.tempVenmoUsername === this.venmoUsername) {
      return; // No change, don't show password dialog
    }

    try {
      const password = await new Promise<string>((resolve, reject) => {
        const submitSub = this.passwordDialog.passwordSubmit.subscribe((pwd: string) => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          resolve(pwd);
        });
        
        const cancelSub = this.passwordDialog.cancel.subscribe(() => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          reject();
        });
        
        this.passwordDialog.open();
      });

      if (password === 'chattanooga' || password === 'password') {
        this.venmoUsername = this.tempVenmoUsername;
        this.onVenmoUsernameChange.emit(this.tempVenmoUsername);
      } else {
        alert('Incorrect password');
        this.tempVenmoUsername = this.venmoUsername; // Reset on invalid password
      }
    } catch {
      // User cancelled
      this.tempVenmoUsername = this.venmoUsername; // Reset on cancel
    }
  }

  onTeamChange(team: 'home' | 'away', name: string) {
    this.onTeamNameChange.emit({ team, name });
  }

  handlePriceChange(price: number) {
    this.onPriceChange.emit(price);
  }

  onVenmoConfirm() {
    window.open(`https://venmo.com/${this.venmoUsername}`, '_blank');
    this.showVenmoDialog = false;
  }

  get venmoMessage(): string {
    return `You will be redirected to <strong class="text-[#008CFF]">Venmo</strong> to pay <strong>${this.venmoUsername}</strong>`;
  }
} 