import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
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
  heroSun,
  heroMoon,
  heroComputerDesktop
} from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { DialogComponent, DialogPart } from '../../../../components/ui/dialog/dialog.component';
import { SanitizationService } from '../../../../core/services/sanitization.service';
import { ThemeService, ThemeMode } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule, ToggleComponent, DialogComponent],
  providers: [
    provideIcons({
      heroCog6Tooth,
      heroTrash,
      heroLockOpen,
      heroLockClosed,
      heroArrowTopRightOnSquare,
      heroCreditCard,
      heroXMark,
      heroSun,
      heroMoon,
      heroComputerDesktop
    })
  ],
  template: `
    <!-- Venmo Confirmation Dialog -->
    <app-dialog
      [isOpen]="showVenmoDialog"
      title="Leave Site?"
      [messageParts]="venmoMessageParts"
      confirmText="Continue to Venmo"
      (onConfirm)="onVenmoConfirm()"
      (onCancel)="showVenmoDialog = false"
    ></app-dialog>

    <!-- Settings Panel -->
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200 overflow-hidden"
         [class.opacity-0]="!isOpen"
         [class.pointer-events-none]="!isOpen"
         (click)="close()">
      <div class="fixed right-0 top-0 bottom-0 w-[90%] sm:w-full sm:max-w-md bg-dialog shadow-lg transform transition-transform duration-200 flex flex-col overflow-hidden"
           [class.translate-x-0]="isOpen"
           [class.translate-x-full]="!isOpen"
           (click)="$event.stopPropagation()">

        <!-- Settings Header -->
        <div class="flex-none flex items-center justify-between p-4 border-b border-default">
          <h2 class="text-lg font-bold text-heading">Settings</h2>
          <button (click)="close()" class="p-2 text-muted hover:text-heading" aria-label="Close settings">
            <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
          </button>
        </div>

        <!-- Settings Content -->
        <div class="flex-1 overflow-y-auto p-4 pt-8 bg-page">
          <!-- Non-owner notice -->
          @if (!isGameOwner && !isManager) {
            <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p class="text-sm text-amber-700">Only the game owner can modify settings.</p>
            </div>
          } @else if (isManager && !isGameOwner) {
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-700">You are a payment manager. You can manage who has paid.</p>
            </div>
          }

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
                [disabled]="!isGameOwner"
                class="w-full px-3 py-2 bg-input border border-input rounded-md text-default
                       focus:outline-none focus:ring-2
                       focus:ring-2 focus:ring-secondary-500
                       capitalize disabled:opacity-50 disabled:cursor-not-allowed"
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
                [disabled]="!isGameOwner"
                class="w-full px-3 py-2 bg-input border border-input rounded-md text-default
                       focus:outline-none focus:ring-2
                       focus:ring-2 focus:ring-secondary-500
                       capitalize disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter home team"
              />
            </div>
          </div>

          <!-- Theme Toggle -->
          <div class="mb-6">
            <label class="block text-label text-sm font-medium mb-2">Appearance</label>
            <div class="flex gap-1 p-1 bg-input rounded-lg">
              <button
                (click)="setTheme('system')"
                [class]="themeService.theme() === 'system' ? 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-card text-default shadow-sm' : 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-muted hover:text-default'"
              >
                <ng-icon name="heroComputerDesktop" class="text-base"></ng-icon>
                <span class="text-sm">System</span>
              </button>
              <button
                (click)="setTheme('light')"
                [class]="themeService.theme() === 'light' ? 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-card text-default shadow-sm' : 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-muted hover:text-default'"
              >
                <ng-icon name="heroSun" class="text-base"></ng-icon>
                <span class="text-sm">Light</span>
              </button>
              <button
                (click)="setTheme('dark')"
                [class]="themeService.theme() === 'dark' ? 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-card text-default shadow-sm' : 'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-muted hover:text-default'"
              >
                <ng-icon name="heroMoon" class="text-base"></ng-icon>
                <span class="text-sm">Dark</span>
              </button>
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
                [disabled]="isLocked || !isGameOwner"
                class="w-full px-3 py-2 bg-input border border-input rounded-md text-default
                       focus:outline-none focus:ring-2
                       focus:ring-2 focus:ring-secondary-500
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
                [disabled]="!isGameOwner"
                class="w-full px-3 py-2 bg-input border border-input rounded-md text-default
                       focus:outline-none focus:ring-2
                       focus:ring-2 focus:ring-secondary-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
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

          <!-- Lock Game toggle (owner only) -->
          <div class="mb-8">
            <div class="flex items-center justify-between p-4 rounded">
              <span class="text-default">Lock Game</span>
              <app-toggle
                class="flex"
                [checked]="isLocked"
                [disabled]="!isGameOwner"
                (onChange)="onToggleLock.emit()"
              ></app-toggle>
            </div>
          </div>

            <!-- Game Controls -->
            <div class="space-y-4 mb-8">
            <!-- Manage Payments (owner or manager) -->
            @if (isGameOwner || isManager) {
              <button
                (click)="onManagePayments.emit()"
                class="w-full bg-control hover:bg-control-hover text-default px-4 py-2 rounded flex items-center justify-center gap-2"
              >
                <ng-icon name="heroCreditCard" class="text-2xl"></ng-icon>
                Manage Payments
              </button>
            }

            <!-- Randomize Numbers (owner only) -->
            @if (isGameOwner) {
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
            }
          </div>


        </div>

        <!-- Footer with Clear Game button (owner only) -->
        @if (isGameOwner) {
          <div class="p-4 border-t border-default mt-auto bg-card">
            <button
              (click)="onClearGame.emit(); close()"
              class="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded flex items-center justify-center gap-2"
            >
              <ng-icon name="heroTrash" class="text-2xl"></ng-icon>
              Clear Game
            </button>
            <p class="text-xs text-gray-500 text-center mt-2">
              This will reset all game data.
            </p>
          </div>
        }
      </div>
    </div>

  `
})
export class SettingsPanelComponent implements OnChanges {
  themeService = inject(ThemeService);
  private sanitizationService = inject(SanitizationService);

  @Input() isOpen = false;
  @Input() isRandomized = false;
  @Input() isLocked = false;
  @Input() venmoUsername = '';
  @Input() homeTeam = '';
  @Input() awayTeam = '';
  @Input() pricePerSquare = 10;
  @Input() isGameOwner = false;
  @Input() isManager = false;

  @Output() closed = new EventEmitter<void>();
  @Output() onRandomize = new EventEmitter<void>();
  @Output() onToggleLock = new EventEmitter<void>();
  @Output() onVenmoUsernameChange = new EventEmitter<string>();
  @Output() onTeamNameChange = new EventEmitter<{team: 'home' | 'away', name: string}>();
  @Output() onPriceChange = new EventEmitter<number>();
  @Output() onManagePayments = new EventEmitter<void>();
  @Output() onClearGame = new EventEmitter<void>();

  showVenmoDialog = false;
  tempVenmoUsername = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      document.body.classList.toggle('overflow-hidden', this.isOpen);
    }
    if (changes['venmoUsername']) {
      this.tempVenmoUsername = this.venmoUsername || '';
    }
  }

  close(): void {
    this.closed.emit();
  }

  showVenmoConfirmation(): void {
    this.showVenmoDialog = true;
  }

  getVenmoLink(): string {
    return `https://venmo.com/${this.venmoUsername.replace('@', '')}`;
  }

  onVenmoBlur(): void {
    if (!this.isGameOwner) {
      this.tempVenmoUsername = this.venmoUsername;
      return;
    }

    const sanitized = this.sanitizationService.sanitizeVenmoUsername(this.tempVenmoUsername);
    if (sanitized === this.venmoUsername) {
      return;
    }

    this.venmoUsername = sanitized;
    this.tempVenmoUsername = sanitized;
    this.onVenmoUsernameChange.emit(sanitized);
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

  get venmoMessageParts(): DialogPart[] {
    return [
      { text: 'You will be redirected to ' },
      { text: 'Venmo', bold: true, color: '#008CFF' },
      { text: ' to pay ' },
      { text: this.venmoUsername, bold: true }
    ];
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }
}
