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
  heroXMark,
  heroArrowPath
} from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { DialogComponent } from '../../../../components/ui/dialog/dialog.component';
import { PasswordDialogComponent } from '../../components/password-dialog/password-dialog.component';
import { EspnGame } from '../../../../core/services/espn.service';

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
      heroXMark,
      heroArrowPath
    })
  ],
  template: `
    <div class="fixed top-0 left-0 right-0 z-[100] bg-page">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <img src="assets/logo.png" alt="Logo" class="h-8 w-auto">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-heading">Football Squares</h1>
        </div>
        <div class="flex items-center gap-2">
          <!-- Venmo Button -->
          @if (venmoUsername) {
            <button 
              (click)="showVenmoDialog = true"
              class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#008CFF] hover:bg-[#0074D4] rounded-lg transition-colors"
            >
              <ng-icon name="heroCreditCard" class="text-lg"></ng-icon>
              <span class="sm:inline">Pay</span>
            </button>
          }

          <!-- Settings Button -->
          <button 
            (click)="toggleSettings()"
            class="p-2 text-muted hover:text-heading rounded-lg hover:bg-card transition-colors flex"
          >
            <ng-icon name="heroCog6Tooth" class="text-2xl"></ng-icon>
          </button>
        </div>
      </div>
    </div>
    <!-- Add spacing to prevent content from going under fixed header -->
    <div class="h-[72px]"></div>

    <!-- Venmo Confirmation Dialog -->
    <app-dialog
      [isOpen]="showVenmoDialog"
      title="Leave Site?"
      [message]="venmoMessage"
      (onConfirm)="onVenmoConfirm()"
      (onCancel)="showVenmoDialog = false"
    ></app-dialog>

    <!-- Settings Panel -->
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200 overflow-hidden"
         [class.opacity-0]="!showSettings"
         [class.pointer-events-none]="!showSettings"
         (click)="closeSettings()">
      <div class="fixed right-0 top-0 bottom-0 w-[90%] sm:w-full sm:max-w-md bg-white shadow-lg transform transition-transform duration-200 flex flex-col overflow-hidden"
           [class.translate-x-0]="showSettings"
           [class.translate-x-full]="!showSettings"
           (click)="$event.stopPropagation()">
        
        <!-- Settings Header -->
        <div class="flex-none flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-bold text-heading">Settings</h2>
          <button (click)="closeSettings()" class="text-muted hover:text-heading">
            <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
          </button>
        </div>

        <!-- Settings Content -->
        <div class="flex-1 overflow-y-auto p-4 pt-8 bg-page">
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

          <!-- ESPN Live Scores (Owner Only) -->
          @if (isGameOwner) {
            <div class="mb-4 p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-heading">ESPN Live Scores</span>
                @if (linkedEspnGame) {
                  <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Linked</span>
                }
              </div>

              @if (linkedEspnGame) {
                <!-- Scoreboard Display -->
                <div class="bg-gray-900 rounded-lg p-3 mb-2 text-white">
                  <div class="flex items-center justify-between text-xs mb-2">
                    <span class="text-gray-400">ESPN</span>
                    <span class="px-1.5 py-0.5 rounded text-xs"
                      [class.bg-yellow-500]="linkedEspnGame.status === 'in'"
                      [class.animate-pulse]="linkedEspnGame.status === 'in'"
                      [class.bg-green-600]="linkedEspnGame.status === 'post'"
                      [class.bg-gray-600]="linkedEspnGame.status === 'pre'"
                    >
                      @if (linkedEspnGame.status === 'pre') { Upcoming }
                      @else if (linkedEspnGame.status === 'in') { Q{{ linkedEspnGame.period }} {{ linkedEspnGame.clock }} }
                      @else { Final }
                    </span>
                  </div>
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="text-gray-400 border-b border-gray-700">
                        <th class="text-left py-1 w-16"></th>
                        <th class="text-center py-1 w-8">1</th>
                        <th class="text-center py-1 w-8">2</th>
                        <th class="text-center py-1 w-8">3</th>
                        <th class="text-center py-1 w-8">4</th>
                        <th class="text-center py-1 w-10 font-bold">T</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="border-b border-gray-800">
                        <td class="py-1 font-semibold">{{ linkedEspnGame.awayTeam }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 0, 'away') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 1, 'away') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 2, 'away') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 3, 'away') }}</td>
                        <td class="text-center py-1 font-bold text-white">{{ linkedEspnGame.awayScore }}</td>
                      </tr>
                      <tr>
                        <td class="py-1 font-semibold">{{ linkedEspnGame.homeTeam }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 0, 'home') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 1, 'home') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 2, 'home') }}</td>
                        <td class="text-center py-1 text-gray-300">{{ getQuarterScore(linkedEspnGame, 3, 'home') }}</td>
                        <td class="text-center py-1 font-bold text-white">{{ linkedEspnGame.homeScore }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                @if (lastSyncTime) {
                  <p class="text-xs text-muted mb-2">Last synced: {{ getTimeSinceSync() }}</p>
                }
                <div class="flex gap-2">
                  <button
                    (click)="onSyncEspn.emit()"
                    [disabled]="isSyncingEspn"
                    class="flex-1 px-3 py-1.5 text-sm bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    @if (isSyncingEspn) {
                      <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Syncing...
                    } @else {
                      Sync Scores
                    }
                  </button>
                  <button
                    (click)="onUnlinkEspn.emit()"
                    class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                  >
                    Unlink
                  </button>
                </div>
              } @else {
                <!-- Game Selection -->
                <div class="flex items-center gap-1.5">
                  <select
                    [(ngModel)]="selectedEspnGameId"
                    class="flex-1 bg-input text-default text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  >
                    <option value="">Select ESPN game...</option>
                    @for (game of espnGames; track game.id) {
                      <option [value]="game.id">{{ getEspnGameDisplay(game) }}</option>
                    }
                  </select>
                  <button
                    (click)="onRefreshEspnGames.emit()"
                    class="p-1.5 text-muted hover:text-heading hover:bg-gray-100 rounded transition-colors"
                    title="Refresh"
                  >
                    <ng-icon name="heroArrowPath" class="text-base"></ng-icon>
                  </button>
                  <button
                    (click)="linkEspnGame()"
                    [disabled]="!selectedEspnGameId"
                    class="px-3 py-1.5 text-sm bg-secondary-500 hover:bg-secondary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
                  >
                    Link
                  </button>
                </div>
              }
            </div>
          }

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
            <div class="flex items-center justify-between p-4 rounded">
              <span class="text-default">Lock Game</span>
              <app-toggle 
              class="flex"
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
        <div class="p-4 border-t border-gray-200 mt-auto bg-card">
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
  @Input() isGameOwner = false;
  @Input() espnEventId: string | undefined;
  @Input() espnGames: EspnGame[] = [];
  @Input() linkedEspnGame: EspnGame | null = null;
  @Input() isSyncingEspn = false;
  @Input() lastSyncTime: Date | null = null;

  @Output() onRandomize = new EventEmitter<void>();
  @Output() onToggleLock = new EventEmitter<void>();
  @Output() onVenmoUsernameChange = new EventEmitter<string>();
  @Output() onTeamNameChange = new EventEmitter<{team: 'home' | 'away', name: string}>();
  @Output() onPriceChange = new EventEmitter<number>();
  @Output() onManagePayments = new EventEmitter<void>();
  @Output() onClearGame = new EventEmitter<void>();
  @Output() onEspnGameChange = new EventEmitter<string>();
  @Output() onSyncEspn = new EventEmitter<void>();
  @Output() onUnlinkEspn = new EventEmitter<void>();
  @Output() onRefreshEspnGames = new EventEmitter<void>();

  showSettings = false;
  showVenmoDialog = false;
  @ViewChild('passwordDialog') passwordDialog!: PasswordDialogComponent;
  tempVenmoUsername = '';
  selectedEspnGameId = '';

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

  getEspnGameDisplay(game: EspnGame): string {
    let status = '';
    if (game.status === 'pre') {
      status = 'Upcoming';
    } else if (game.status === 'in') {
      status = `Q${game.period} ${game.clock}`;
    } else {
      status = 'Final';
    }
    return `${game.awayTeam} @ ${game.homeTeam} - ${status}`;
  }

  getQuarterScore(game: EspnGame, quarter: number, team: 'home' | 'away'): number {
    return game.quarters[quarter]?.[team] ?? 0;
  }

  linkEspnGame(): void {
    if (this.selectedEspnGameId) {
      this.onEspnGameChange.emit(this.selectedEspnGameId);
      this.selectedEspnGameId = '';
    }
  }

  getTimeSinceSync(): string {
    if (!this.lastSyncTime) return '';
    const seconds = Math.floor((Date.now() - this.lastSyncTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
} 