import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown, heroArrowRightOnRectangle, heroComputerDesktop, heroSun, heroMoon, heroSquares2x2, heroQuestionMarkCircle } from '@ng-icons/heroicons/outline';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';

/** Header avatar chip with the profile menu: display name, theme, sign out. Shared by the dashboard and game page. */
@Component({
  selector: 'app-profile-menu',
  imports: [FormsModule, RouterLink, NgIconComponent],
  providers: [provideIcons({ heroChevronDown, heroArrowRightOnRectangle, heroComputerDesktop, heroSun, heroMoon, heroSquares2x2, heroQuestionMarkCircle })],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    @keyframes menu-in { from { opacity: 0; transform: translateY(-4px); } }
    .animate-menu-in { animation: menu-in 120ms cubic-bezier(.2,.7,.2,1); }
    @media (prefers-reduced-motion: reduce) { .animate-menu-in { animation: none; } }
  `],
  template: `
        <div class="relative" [attr.data-walkthrough]="walkthroughTarget">
      <button
        type="button"
        (click)="toggleProfileDropdown($event)"
        [attr.aria-expanded]="showProfileDropdown()"
        aria-haspopup="true"
        aria-controls="profile-menu"
        class="flex min-h-11 items-center gap-2 rounded-btn border border-white/15 py-1 pl-1.5 pr-3 transition-colors hover:bg-white/10"
      >
        @if (currentUser()?.photoURL) {
          <img [src]="currentUser()?.photoURL ?? ''" alt="" class="h-8 w-8 rounded-full" />
        } @else {
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-qs-accent text-sm font-semibold text-qs-on-accent" aria-hidden="true">
            {{ (currentUser()?.displayName || currentUser()?.email)?.charAt(0)?.toUpperCase() || '?' }}
          </span>
        }
        <span class="hidden max-w-40 truncate text-sm font-medium text-qs-tile-ink sm:inline">
          {{ currentUser()?.displayName || currentUser()?.email }}
        </span>
        <span class="sr-only sm:hidden">Profile menu</span>
        <ng-icon name="heroChevronDown" class="text-sm text-qs-tile-muted transition-transform" [class.rotate-180]="showProfileDropdown()"></ng-icon>
      </button>

      @if (showProfileDropdown()) {
        <div
          id="profile-menu"
          class="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-qs-line bg-qs-panel text-qs-ink shadow-pop animate-menu-in"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-qs-line p-4">
            @if (currentUser()?.photoURL) {
              <img [src]="currentUser()?.photoURL ?? ''" alt="" class="h-10 w-10 rounded-full" />
            } @else {
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-qs-accent font-semibold text-qs-on-accent" aria-hidden="true">
                {{ (currentUser()?.displayName || currentUser()?.email)?.charAt(0)?.toUpperCase() || '?' }}
              </span>
            }
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ currentUser()?.displayName || 'No name set' }}</p>
              <p class="truncate text-sm text-qs-muted">{{ currentUser()?.email || 'Guest account' }}</p>
            </div>
            @if (currentUser()?.isGuest) {
              <span class="qs-badge qs-badge-warn">Guest</span>
            }
          </div>

          <div class="space-y-5 p-4">
            @if (allowNameEdit) {
<div>
              <label for="profile-name" class="qs-label mb-1.5 block text-qs-muted">Display name</label>
              <div class="flex gap-2">
                <input
                  id="profile-name"
                  type="text"
                  [(ngModel)]="profileName"
                  placeholder="Your name"
                  class="qs-input min-w-0 flex-1"
                  (keyup.enter)="saveProfile()"
                />
                <button
                  type="button"
                  (click)="saveProfile()"
                  [disabled]="isSavingProfile() || !profileName.trim()"
                  [attr.aria-busy]="isSavingProfile()"
                  class="qs-btn qs-btn-ink shrink-0"
                >
                  Save
                </button>
              </div>
            </div>
          }

          <div>
              <p id="theme-label" class="qs-label mb-1.5 text-qs-muted">Theme</p>
              <div class="grid grid-cols-3 gap-1 rounded-btn border border-qs-line bg-qs-panel-2 p-1" role="radiogroup" aria-labelledby="theme-label">
                @for (opt of themeOptions; track opt.value) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="themeService.theme() === opt.value"
                    (click)="setTheme(opt.value)"
                    class="qs-label flex min-h-9 items-center justify-center gap-1.5 rounded-[4px] transition-colors"
                    [class]="themeService.theme() === opt.value ? 'bg-qs-ink text-qs-bg' : 'text-qs-muted hover:text-qs-ink'"
                  >
                    <ng-icon [name]="opt.icon" class="text-sm"></ng-icon>
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="border-t border-qs-line p-2">
            @if (showTourLink) {
              <button type="button" (click)="showProfileDropdown.set(false); tour.emit()" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink sm:hidden">
                <ng-icon name="heroQuestionMarkCircle" class="text-base"></ng-icon>
                How it works
              </button>
            }
            @if (showDashboardLink && !currentUser()?.isGuest) {
              <a routerLink="/dashboard" class="qs-btn qs-btn-ghost w-full justify-start text-qs-ink">
                <ng-icon name="heroSquares2x2" class="text-base"></ng-icon>
                Your games
              </a>
            }
            <button
              type="button"
              (click)="signOut()"
              class="qs-btn qs-btn-ghost w-full justify-start text-qs-bad hover:!bg-qs-bad-soft"
            >
              <ng-icon name="heroArrowRightOnRectangle" class="text-base"></ng-icon>
              Sign out
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ProfileMenuComponent {
  /** The game page has its own name editor, so it hides this one. */
  @Input() allowNameEdit = true;
  @Input() showDashboardLink = false;
  @Input() walkthroughTarget: string | null = null;
  /** Adds a "How it works" item (phones only); the header shows a help icon on larger screens. */
  @Input() showTourLink = false;
  @Output() tour = new EventEmitter<void>();

  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);
  private gameService = inject(GameService);
  private router = inject(Router);
  private sanitizationService = inject(SanitizationService);

  currentUser = this.authService.currentUser;
  isSavingProfile = signal(false);
  profileName = '';
  showProfileDropdown = signal(false);
  readonly themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'system', label: 'Auto', icon: 'heroComputerDesktop' },
    { value: 'light', label: 'Light', icon: 'heroSun' },
    { value: 'dark', label: 'Dark', icon: 'heroMoon' }
  ];

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showProfileDropdown.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showProfileDropdown.set(false);
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    const isOpening = !this.showProfileDropdown();
    this.showProfileDropdown.set(isOpening);
    if (isOpening) {
      this.profileName = this.currentUser()?.displayName || '';
    }
  }

  async saveProfile(): Promise<void> {
    const sanitizedName = this.sanitizationService.sanitizeDisplayName(this.profileName);
    if (!sanitizedName) return;

    this.isSavingProfile.set(true);
    try {
      const user = this.currentUser();
      const oldName = user?.displayName || '';
      if (user?.isGuest) {
        this.authService.updateGuestName(sanitizedName);
      } else {
        await this.authService.updateDisplayName(sanitizedName);
      }
      this.profileName = sanitizedName;
      if (user && oldName && oldName !== sanitizedName) {
        await this.gameService.propagateNameChange(user.uid, oldName, sanitizedName);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/']);
  }
}
