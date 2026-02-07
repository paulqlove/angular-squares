import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem } from '../../core/services/game.service';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import {
  heroPlus,
  heroArrowRightOnRectangle,
  heroSquares2x2,
  heroShare,
  heroTrash,
  heroLockClosed,
  heroUserGroup,
  heroArrowTopRightOnSquare,
  heroXMark,
  heroTrophy,
  heroClock,
  heroCheckCircle,
  heroPencilSquare,
  heroArrowRight,
  heroTicket,
  heroPlay,
  heroCog6Tooth,
  heroSun,
  heroMoon,
  heroComputerDesktop,
  heroChevronDown,
  heroQuestionMarkCircle
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AppHeaderComponent],
  providers: [
    provideIcons({
      heroPlus,
      heroArrowRightOnRectangle,
      heroSquares2x2,
      heroShare,
      heroTrash,
      heroLockClosed,
      heroUserGroup,
      heroArrowTopRightOnSquare,
      heroXMark,
      heroTrophy,
      heroClock,
      heroCheckCircle,
      heroPencilSquare,
      heroArrowRight,
      heroTicket,
      heroPlay,
      heroCog6Tooth,
      heroSun,
      heroMoon,
      heroComputerDesktop,
      heroChevronDown,
      heroQuestionMarkCircle
    })
  ],
  template: `
    <div class="min-h-screen bg-page">
      <!-- Header -->
      <app-shared-header variant="solid">
        <!-- Help Button -->
        <button
          (click)="startWalkthrough()"
          class="p-2 text-header-muted hover:text-header rounded-lg hover:bg-header-accent transition-colors flex items-center justify-center"
          title="Show tutorial"
          aria-label="Show tutorial"
        >
          <ng-icon name="heroQuestionMarkCircle" class="text-xl"></ng-icon>
        </button>

        <!-- Profile Dropdown -->
        <div class="relative" data-walkthrough="profile-dropdown">
          <button
            (click)="toggleProfileDropdown($event)"
            class="flex items-center gap-2 bg-header-accent hover:bg-primary-700 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
            title="Profile menu"
          >
            @if (currentUser()?.photoURL) {
              <img
                [src]="currentUser()?.photoURL"
                alt="Profile"
                class="w-7 h-7 rounded-full ring-2 ring-primary-500"
              />
            } @else {
              <div class="w-7 h-7 rounded-full bg-secondary-500 flex items-center justify-center">
                <span class="text-white font-semibold text-sm">
                  {{ (currentUser()?.displayName || currentUser()?.email)?.charAt(0)?.toUpperCase() || '?' }}
                </span>
              </div>
            }
            <span class="text-sm font-medium text-header hidden sm:inline">
              {{ currentUser()?.displayName || currentUser()?.email }}
            </span>
            @if (currentUser()?.isGuest) {
              <span class="text-xs bg-primary-600 text-primary-200 px-2 py-0.5 rounded-full">Guest</span>
            }
            <ng-icon name="heroChevronDown" class="text-sm text-header-muted"></ng-icon>
          </button>

          @if (showProfileDropdown()) {
            <div class="absolute right-0 mt-2 w-64 bg-dialog rounded-xl shadow-lg border border-default p-4 z-50" (click)="$event.stopPropagation()">
              <!-- Name input -->
              <div class="mb-4">
                <label class="block text-xs font-semibold text-muted mb-1.5">Display Name</label>
                <div class="flex flex-wrap gap-2">
                  <input
                    type="text"
                    [(ngModel)]="profileName"
                    placeholder="Enter your name"
                    class="flex-1 min-w-0 px-3 py-2 bg-input border border-input rounded-lg text-sm text-default focus:border-secondary-500 focus:ring-1 focus:ring-secondary-100 outline-none"
                    (keyup.enter)="saveProfile()"
                  />
                  <button
                    (click)="saveProfile()"
                    [disabled]="isSavingProfile() || !profileName.trim()"
                    class="flex-1 px-3 py-2 bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    @if (isSavingProfile()) {
                      ...
                    } @else {
                      Save
                    }
                  </button>
                </div>
                @if (currentUser()?.email) {
                  <p class="text-xs text-muted mt-1">{{ currentUser()?.email }}</p>
                }
              </div>

              <!-- Theme toggle -->
              <div class="mb-4">
                <label class="block text-xs font-semibold text-muted mb-1.5">Theme</label>
                <div class="flex items-center bg-control rounded-lg p-1">
                  <button
                    (click)="setTheme('system')"
                    [class]="themeService.theme() === 'system' ? 'flex-1 p-2 rounded-md bg-secondary-500 text-white' : 'flex-1 p-2 rounded-md text-muted hover:text-default'"
                    title="System theme"
                    aria-label="System theme"
                  >
                    <ng-icon name="heroComputerDesktop" class="text-base"></ng-icon>
                  </button>
                  <button
                    (click)="setTheme('light')"
                    [class]="themeService.theme() === 'light' ? 'flex-1 p-2 rounded-md bg-secondary-500 text-white' : 'flex-1 p-2 rounded-md text-muted hover:text-default'"
                    title="Light theme"
                    aria-label="Light theme"
                  >
                    <ng-icon name="heroSun" class="text-base"></ng-icon>
                  </button>
                  <button
                    (click)="setTheme('dark')"
                    [class]="themeService.theme() === 'dark' ? 'flex-1 p-2 rounded-md bg-secondary-500 text-white' : 'flex-1 p-2 rounded-md text-muted hover:text-default'"
                    title="Dark theme"
                    aria-label="Dark theme"
                  >
                    <ng-icon name="heroMoon" class="text-base"></ng-icon>
                  </button>
                </div>
              </div>

              <!-- Sign out -->
              <button
                (click)="signOut()"
                class="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
              >
                <ng-icon name="heroArrowRightOnRectangle" class="text-base"></ng-icon>
                Sign Out
              </button>
            </div>
          }
        </div>
      </app-shared-header>

      <main class="container mx-auto px-4 py-8">
        <!-- Hero Section -->
        <div class="bg-card border border-card rounded-2xl shadow-xl p-8 mb-8 dark:bg-gradient-to-br dark:from-header-accent dark:to-header dark:border-0" data-walkthrough="hero-section">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-3xl">🏈</span>
            <h2 class="text-2xl font-bold text-heading dark:text-white tracking-tight">Start or Join a Game</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Create Game Card -->
            @if (canCreateGame()) {
              <button
                (click)="openCreateModal()"
                class="group bg-control hover:bg-control-hover dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur border border-default dark:border-white/20 rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
                data-walkthrough="create-game"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div class="w-12 h-12 rounded-xl bg-secondary-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ng-icon name="heroPlus" class="text-2xl text-white"></ng-icon>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-heading dark:text-white">New Game</h3>
                    <p class="text-sm text-muted dark:text-primary-200">Create a squares pool</p>
                  </div>
                </div>
                <p class="text-sm text-muted dark:text-primary-300">Set up your own game with custom settings and share it with friends.</p>
              </button>
            } @else {
              <div class="bg-amber-100 dark:bg-amber-500/20 backdrop-blur border border-amber-300 dark:border-amber-400/30 rounded-xl p-6">
                <div class="flex items-center gap-4 mb-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                    <ng-icon name="heroUserGroup" class="text-2xl text-white"></ng-icon>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-amber-900 dark:text-white">Guest Mode</h3>
                    <p class="text-sm text-amber-700 dark:text-amber-200">Sign in to create games</p>
                  </div>
                </div>
                <p class="text-sm text-amber-700 dark:text-amber-100 mb-4">Create an account to host your own squares pools.</p>
                <button
                  (click)="signOut()"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            }

            <!-- Join Game Card -->
            <div class="bg-control dark:bg-white/10 backdrop-blur border border-default dark:border-white/20 rounded-xl p-6" data-walkthrough="join-game">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center">
                  <ng-icon name="heroTicket" class="text-2xl text-white"></ng-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-heading dark:text-white">Join with Code</h3>
                  <p class="text-sm text-muted dark:text-primary-200">Have a 6-digit code?</p>
                </div>
              </div>
              <div class="flex gap-2 min-w-0">
                <input
                  type="text"
                  [(ngModel)]="joinGameCode"
                  placeholder="XXXXXX"
                  class="flex-1 min-w-0 px-4 py-3 bg-input dark:bg-white/10 border border-input dark:border-white/20 rounded-lg text-default dark:text-white placeholder-muted dark:placeholder-primary-400 uppercase tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  maxlength="6"
                  (keyup.enter)="joinGame()"
                />
                <button
                  (click)="joinGame()"
                  [disabled]="joinGameCode.length !== 6"
                  class="shrink-0 px-4 py-3 bg-accent-500 hover:bg-accent-400 disabled:bg-control disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <ng-icon name="heroArrowRight" class="text-xl"></ng-icon>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- My Games Section -->
        @if (canCreateGame()) {
          <div class="mb-4" data-walkthrough="my-games">
            <h2 class="text-xl font-bold text-heading tracking-tight">My Games</h2>
          </div>

          @if (isLoadingGames()) {
            <div class="flex items-center justify-center py-16">
              <svg class="animate-spin h-10 w-10 text-secondary-500" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          } @else if (myGames().length === 0) {
            <div class="bg-card rounded-2xl shadow-sm p-12 text-center">
              <div class="w-20 h-20 rounded-full bg-control flex items-center justify-center mx-auto mb-4">
                <ng-icon name="heroSquares2x2" class="text-4xl text-muted"></ng-icon>
              </div>
              <h3 class="text-lg font-semibold text-heading mb-2">No games yet</h3>
              <p class="text-muted mb-6">Create your first squares pool to get started!</p>
              <button
                (click)="openCreateModal()"
                class="inline-flex items-center gap-2 px-6 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl font-medium transition-colors"
              >
                <ng-icon name="heroPlus" class="text-xl"></ng-icon>
                Create Game
              </button>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              @for (game of myGames(); track game.id) {
                <div class="bg-card rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group border border-card">
                  <!-- Game Header -->
                  <div class="bg-control dark:bg-gradient-to-r dark:from-header-accent dark:to-header p-4">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="font-bold text-heading dark:text-white truncate">{{ game.name }}</h3>
                      @if (game.isLocked) {
                        <span class="flex items-center gap-1 text-xs bg-amber-500 text-white px-2 py-1 rounded-full">
                          <ng-icon name="heroLockClosed" class="text-xs"></ng-icon>
                          Locked
                        </span>
                      } @else {
                        <span class="flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          <ng-icon name="heroPlay" class="text-xs"></ng-icon>
                          Active
                        </span>
                      }
                    </div>
                    <p class="text-sm text-muted dark:text-primary-300">
                      @if (game.homeTeam && game.awayTeam) {
                        {{ game.awayTeam }} vs {{ game.homeTeam }}
                      } @else {
                        <span class="italic">No teams set</span>
                      }
                    </p>
                  </div>

                  <!-- Game Content -->
                  <div class="p-4">
                    <!-- Progress Bar -->
                    <div class="mb-3">
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-muted">Squares Filled</span>
                        <span class="font-semibold text-default">{{ game.squaresFilled }}/100</span>
                      </div>
                      <div class="h-2 bg-control rounded-full overflow-hidden">
                        <div
                          class="h-full bg-gradient-to-r from-secondary-400 to-secondary-500 rounded-full transition-all duration-500"
                          [style.width.%]="game.squaresFilled"
                        ></div>
                      </div>
                    </div>

                    <div class="mb-4">
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-muted">Collected</span>
                        <span class="font-semibold text-default">\${{ game.collected }} / \${{ game.totalPot }}</span>
                      </div>
                      <div class="h-2 bg-control rounded-full overflow-hidden">
                        <div
                          class="h-full bg-green-500 rounded-full transition-all duration-500"
                          [style.width.%]="game.totalPot > 0 ? (game.collected / game.totalPot) * 100 : 0"
                        ></div>
                      </div>
                    </div>

                    <!-- Stats Row -->
                    <div class="flex items-center gap-4 text-sm text-muted mb-4">
                      <span class="flex items-center gap-1">
                        <ng-icon name="heroUserGroup" class="text-base"></ng-icon>
                        {{ game.playerCount }} players
                      </span>
                      <span class="text-muted">|</span>
                      <span class="font-mono text-xs bg-control px-2 py-0.5 rounded">{{ game.id }}</span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                      <button
                        (click)="openGame(game.id)"
                        class="flex-1 px-4 py-2.5 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl font-medium transition-colors"
                      >
                        Open Game
                      </button>
                      <button
                        (click)="shareGame(game.id)"
                        class="p-2.5 text-muted hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors"
                        title="Share game"
                        aria-label="Share game"
                      >
                        <ng-icon name="heroShare" class="text-lg"></ng-icon>
                      </button>
                      <button
                        (click)="openEditModal(game)"
                        class="p-2.5 text-muted hover:text-default hover:bg-control rounded-xl transition-colors"
                        title="Edit game"
                        aria-label="Edit game"
                      >
                        <ng-icon name="heroCog6Tooth" class="text-lg"></ng-icon>
                      </button>
                      <button
                        (click)="deleteGame(game.id)"
                        class="p-2.5 text-muted hover:text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                        title="Delete game"
                        aria-label="Delete game"
                      >
                        <ng-icon name="heroTrash" class="text-lg"></ng-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="px-4 py-3 bg-input border-t border-default">
                    <span class="text-xs text-muted">Created {{ formatDate(game.createdAt) }}</span>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- Joined Games Section -->
        @if (joinedGames().length > 0) {
          <div class="mt-10 mb-4">
            <div class="flex items-center gap-2 mb-1">
              <ng-icon name="heroUserGroup" class="text-xl text-muted"></ng-icon>
              <h2 class="text-xl font-bold text-heading tracking-tight">Joined Games</h2>
            </div>
            <p class="text-sm text-muted">Games you've joined by selecting squares</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (game of joinedGames(); track game.id) {
              <div class="bg-card rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group border border-card border-l-4 border-l-secondary-500">
                <!-- Game Header -->
                <div class="bg-control dark:bg-gradient-to-r dark:from-header-accent dark:to-header p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-heading dark:text-white truncate">{{ game.name }}</h3>
                    <span class="flex items-center gap-1 text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full dark:bg-secondary-500/20 dark:text-secondary-300">
                      <ng-icon name="heroUserGroup" class="text-xs"></ng-icon>
                      Joined
                    </span>
                  </div>
                  <p class="text-sm text-muted dark:text-primary-300">
                    @if (game.homeTeam && game.awayTeam) {
                      {{ game.awayTeam }} vs {{ game.homeTeam }}
                    } @else {
                      <span class="italic">No teams set</span>
                    }
                  </p>
                  <p class="text-xs text-muted dark:text-primary-400 mt-1">
                    Hosted by {{ game.ownerName }}
                  </p>
                </div>

                <!-- Game Content -->
                <div class="p-4">
                  <!-- Progress Bar -->
                  <div class="mb-3">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-muted">Squares Filled</span>
                      <span class="font-semibold text-default">{{ game.squaresFilled }}/100</span>
                    </div>
                    <div class="h-2 bg-control rounded-full overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-secondary-400 to-secondary-500 rounded-full transition-all duration-500"
                        [style.width.%]="game.squaresFilled"
                      ></div>
                    </div>
                  </div>

                  <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-muted">Collected</span>
                      <span class="font-semibold text-default">\${{ game.collected }} / \${{ game.totalPot }}</span>
                    </div>
                    <div class="h-2 bg-control rounded-full overflow-hidden">
                      <div
                        class="h-full bg-green-500 rounded-full transition-all duration-500"
                        [style.width.%]="game.totalPot > 0 ? (game.collected / game.totalPot) * 100 : 0"
                      ></div>
                    </div>
                  </div>

                  <!-- Stats Row -->
                  <div class="flex items-center gap-4 text-sm text-muted mb-4">
                    <span class="flex items-center gap-1">
                      <ng-icon name="heroUserGroup" class="text-base"></ng-icon>
                      {{ game.playerCount }} players
                    </span>
                    <span class="text-muted">|</span>
                    <span class="font-mono text-xs bg-control px-2 py-0.5 rounded">{{ game.id }}</span>
                  </div>

                  <!-- Actions (Open and Share only) -->
                  <div class="flex items-center gap-2">
                    <button
                      (click)="openGame(game.id)"
                      class="flex-1 px-4 py-2.5 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl font-medium transition-colors"
                    >
                      Open Game
                    </button>
                    <button
                      (click)="shareGame(game.id)"
                      class="p-2.5 text-muted hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors"
                      title="Share game"
                      aria-label="Share game"
                    >
                      <ng-icon name="heroShare" class="text-lg"></ng-icon>
                    </button>
                  </div>
                </div>

                <!-- Footer -->
                <div class="px-4 py-3 bg-input border-t border-default">
                  <span class="text-xs text-muted">Created {{ formatDate(game.createdAt) }}</span>
                </div>
              </div>
            }
          </div>
        }
      </main>

      <!-- Create Game Modal -->
      @if (showCreateModal()) {
        <div
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          (click)="showCreateModal.set(false)"
        >
          <div
            class="bg-dialog rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-in"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-default">
              <div>
                <h3 class="text-xl font-bold text-heading">Create New Game</h3>
                <p class="text-sm text-muted">Set up your squares pool</p>
              </div>
              <button
                (click)="showCreateModal.set(false)"
                class="p-2 text-muted hover:text-default hover:bg-control rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-6">
              <!-- Sport Tabs -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">Sport</label>
                <div class="flex gap-2 overflow-x-auto">
                  @for (sport of sportOptions; track sport.value) {
                    <button
                      (click)="selectSport(sport.value)"
                      [class]="selectedSport === sport.value
                        ? 'px-6 py-2.5 bg-header text-header rounded-lg font-medium transition-colors whitespace-nowrap'
                        : 'px-6 py-2.5 bg-control text-default hover:bg-control-hover rounded-lg font-medium transition-colors whitespace-nowrap'"
                    >
                      {{ sport.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Game Selection -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">Select Game</label>
                @if (isLoadingEspnGames()) {
                  <div class="flex items-center justify-center py-8">
                    <svg class="animate-spin h-6 w-6 text-secondary-500" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    <!-- Manual Scores Option - Hidden for now
                    <button
                      (click)="selectEspnGame('')"
                      [class]="selectedEspnGameId === ''
                        ? 'p-4 border-2 border-secondary-500 bg-secondary-100 rounded-xl text-left transition-all'
                        : 'p-4 border-2 border-default hover:border-hover rounded-xl text-left transition-all'"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-control flex items-center justify-center"
                          [class.bg-secondary-200]="selectedEspnGameId === ''">
                          <ng-icon name="heroPencilSquare" class="text-lg text-muted"
                            [class.text-secondary-700]="selectedEspnGameId === ''"></ng-icon>
                        </div>
                        <div>
                          <p class="font-semibold"
                            [class]="selectedEspnGameId === '' ? 'text-secondary-900' : 'text-heading'">Manual Scores</p>
                          <p class="text-xs"
                            [class]="selectedEspnGameId === '' ? 'text-secondary-700' : 'text-muted'">Enter scores yourself</p>
                        </div>
                      </div>
                    </button>
                    -->

                    <!-- ESPN Games -->
                    @for (game of espnGames(); track game.id) {
                      <button
                        (click)="selectEspnGame(game.id)"
                        [class]="selectedEspnGameId === game.id
                          ? 'p-4 border-2 border-secondary-500 bg-secondary-100 rounded-xl text-left transition-all'
                          : 'p-4 border-2 border-default hover:border-hover rounded-xl text-left transition-all'"
                      >
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="getGameStatusClass(game.status)">
                            {{ getGameStatusText(game) }}
                          </span>
                        </div>
                        <p class="font-semibold text-sm"
                          [class]="selectedEspnGameId === game.id ? 'text-secondary-900' : 'text-heading'">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                        @if (game.status === 'pre' && game.date) {
                          <p class="text-xs mt-1"
                            [class]="selectedEspnGameId === game.id ? 'text-secondary-700' : 'text-muted'">{{ formatGameDate(game.date) }}</p>
                        }
                        @if (game.status !== 'pre') {
                          <p class="text-xs mt-1"
                            [class]="selectedEspnGameId === game.id ? 'text-secondary-700' : 'text-muted'">{{ game.awayScore }} - {{ game.homeScore }}</p>
                        }
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Price Selection -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">Price per Square</label>
                <div class="flex flex-wrap gap-2">
                  @for (price of pricePresets; track price) {
                    <button
                      (click)="selectPrice(price)"
                      [class]="newGamePrice === price
                        ? 'px-5 py-2.5 bg-secondary-500 text-white rounded-lg font-medium transition-colors'
                        : 'px-5 py-2.5 bg-control text-default hover:bg-control-hover rounded-lg font-medium transition-colors'"
                    >
                      {{ price === 0 ? 'Free' : '$' + price }}
                    </button>
                  }
                  <div class="flex items-center gap-1 px-3 py-2 bg-control rounded-lg">
                    <span class="text-muted">$</span>
                    <input
                      type="number"
                      [(ngModel)]="customPrice"
                      (ngModelChange)="onCustomPriceChange()"
                      placeholder="Custom"
                      min="0"
                      class="w-16 bg-transparent text-default font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <!-- Game Name -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">Game Name <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="newGameName"
                  placeholder="e.g., Super Bowl Party 2024"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                  [class.border-red-500]="gameNameError()"
                />
                @if (gameNameError()) {
                  <p class="mt-2 text-sm text-red-600 dark:text-red-400">Game name is required</p>
                }
              </div>

              <!-- Venmo Username -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">
                  Venmo Username
                  <span class="text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="newGameVenmoUsername"
                  placeholder="@username"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                />
              </div>

              <!-- Payment Manager -->
              <div>
                <label class="block text-sm font-semibold text-label mb-3">
                  Payment Manager
                  <span class="text-muted font-normal">(optional)</span>
                </label>
                <p class="text-xs text-muted mb-2">Assign someone to help manage payments. Enter their email address.</p>
                <input
                  type="email"
                  [(ngModel)]="newGamePaymentManager"
                  placeholder="Enter their email address"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                />
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-default bg-input">
              <button
                (click)="showCreateModal.set(false)"
                class="px-6 py-2.5 text-muted hover:bg-control rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="createGame()"
                [disabled]="isCreating()"
                class="px-8 py-2.5 bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
              >
                @if (isCreating()) {
                  <span class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Creating...
                  </span>
                } @else {
                  Create Game
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Share Modal -->
      @if (shareModalGameId()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="shareModalGameId.set(null)">
          <div class="bg-dialog rounded-2xl shadow-2xl max-w-md w-full animate-modal-in" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-default">
              <h3 class="text-xl font-bold text-heading">Share Game</h3>
              <button
                (click)="shareModalGameId.set(null)"
                class="p-2 text-muted hover:text-default hover:bg-control rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <div class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Game Code</label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 bg-control px-4 py-4 rounded-xl font-mono text-2xl tracking-widest text-center text-heading">
                    {{ shareModalGameId() }}
                  </code>
                  <button
                    (click)="copyToClipboard(shareModalGameId()!)"
                    class="p-4 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-label mb-2">Share Link</label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="getShareLink(shareModalGameId()!)"
                    readonly
                    class="flex-1 px-4 py-3 bg-control rounded-xl text-sm truncate text-muted"
                  />
                  <button
                    (click)="copyToClipboard(getShareLink(shareModalGameId()!))"
                    class="px-4 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-xl transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <!-- Copied notification -->
              @if (copiedToClipboard()) {
                <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm text-center dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
                  Copied to clipboard!
                </div>
              }
            </div>

            <div class="p-6 border-t border-default bg-input rounded-b-2xl">
              <button
                (click)="shareModalGameId.set(null)"
                class="w-full px-4 py-3 bg-control hover:bg-control-hover text-default rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Edit Game Modal -->
      @if (showEditModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="closeEditModal()">
          <div class="bg-dialog rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-in" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-default">
              <div>
                <h3 class="text-xl font-bold text-heading">Edit Game</h3>
                <p class="text-sm text-muted">{{ editingGame()?.id }}</p>
              </div>
              <button
                (click)="closeEditModal()"
                class="p-2 text-muted hover:text-default hover:bg-control rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <div class="p-6 space-y-5">
              <!-- Sport Tabs -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Sport</label>
                <div class="flex gap-2 overflow-x-auto">
                  @for (sport of sportOptions; track sport.value) {
                    <button
                      (click)="selectEditSport(sport.value)"
                      [class]="editSport === sport.value
                        ? 'px-4 py-2 bg-header text-header rounded-lg font-medium transition-colors whitespace-nowrap text-sm'
                        : 'px-4 py-2 bg-control text-default hover:bg-control-hover rounded-lg font-medium transition-colors whitespace-nowrap text-sm'"
                    >
                      {{ sport.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- ESPN Game Selection -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">ESPN Game</label>
                @if (isLoadingEditEspnGames()) {
                  <div class="flex items-center justify-center py-6">
                    <svg class="animate-spin h-6 w-6 text-secondary-500" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    @for (game of editEspnGames(); track game.id) {
                      <button
                        (click)="selectEditEspnGame(game.id)"
                        [class]="editEspnGameId === game.id
                          ? 'p-3 border-2 border-secondary-500 bg-secondary-100 rounded-xl text-left transition-all'
                          : 'p-3 border-2 border-default hover:border-hover rounded-xl text-left transition-all'"
                      >
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="font-semibold text-sm"
                              [class]="editEspnGameId === game.id ? 'text-secondary-900' : 'text-heading'">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                            @if (game.status === 'pre' && game.date) {
                              <p class="text-xs"
                                [class]="editEspnGameId === game.id ? 'text-secondary-700' : 'text-muted'">{{ formatGameDate(game.date) }}</p>
                            }
                            @if (game.status !== 'pre') {
                              <p class="text-xs"
                                [class]="editEspnGameId === game.id ? 'text-secondary-700' : 'text-muted'">{{ game.awayScore }} - {{ game.homeScore }}</p>
                            }
                          </div>
                          <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="getGameStatusClass(game.status)">
                            {{ getGameStatusText(game) }}
                          </span>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Game Name -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Game Name</label>
                <input
                  type="text"
                  [(ngModel)]="editGameName"
                  placeholder="e.g., Super Bowl Party 2024"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                />
              </div>

              <!-- Price Per Square -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Price Per Square</label>
                <div class="flex items-center gap-2">
                  <span class="text-muted">$</span>
                  <input
                    type="number"
                    [(ngModel)]="editGamePrice"
                    min="0"
                    class="flex-1 px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                  />
                </div>
              </div>

              <!-- Venmo Username -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Venmo Username</label>
                <input
                  type="text"
                  [(ngModel)]="editGameVenmoUsername"
                  placeholder="@username"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                />
              </div>

              <!-- Manager Assignment -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">
                  Payment Manager
                  <span class="text-muted font-normal">(optional)</span>
                </label>
                <p class="text-xs text-muted mb-2">Assign a player to help manage payments. They can mark who has paid.</p>
                @if (editingGame()?.managerId) {
                  <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl dark:bg-green-900/30 dark:border-green-800">
                    <span class="flex-1 text-green-700 dark:text-green-400">{{ editingGame()?.managerName || editingGame()?.managerEmail || 'Assigned' }}</span>
                    <button
                      (click)="removeManager()"
                      class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                } @else if (editGamePlayers().length > 0) {
                  <div class="relative">
                    <input
                      type="text"
                      [(ngModel)]="managerSearchQuery"
                      (input)="onManagerSearchInput()"
                      (focus)="onManagerSearchFocus()"
                      (keydown)="onManagerSearchKeydown($event)"
                      placeholder="Search players..."
                      class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none text-default"
                      autocomplete="off"
                    />
                    @if (showManagerDropdown() && managerSearchResults().length > 0) {
                      <div class="absolute z-10 mt-1 w-full bg-dialog border border-default rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        @for (player of managerSearchResults(); track player.uid; let i = $index) {
                          <button
                            (mousedown)="assignManagerFromPlayer(player)"
                            (mouseenter)="selectedManagerIndex.set(i)"
                            [class]="i === selectedManagerIndex()
                              ? 'w-full px-4 py-3 text-left text-default bg-secondary-100 dark:bg-secondary-900/30 transition-colors'
                              : 'w-full px-4 py-3 text-left text-default hover:bg-control transition-colors'"
                          >
                            {{ player.name }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-muted italic">No players have joined yet</p>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-6 border-t border-default bg-input rounded-b-2xl">
              <button
                (click)="closeEditModal()"
                class="px-6 py-2.5 text-muted hover:bg-control rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="saveGameEdits()"
                [disabled]="isSavingGame()"
                class="px-8 py-2.5 bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
              >
                @if (isSavingGame()) {
                  Saving...
                } @else {
                  Save Changes
                }
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    @keyframes modal-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    .animate-modal-in {
      animation: modal-in 0.2s ease-out;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private espnService = inject(EspnService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private walkthroughService = inject(WalkthroughService);
  private sanitizationService = inject(SanitizationService);
  themeService = inject(ThemeService);

  private dashboardWalkthroughSteps: WalkthroughStep[] = [
    {
      target: 'hero-section',
      title: 'Welcome to Football Squares!',
      description: 'This is where you can create new games or join existing ones. Let\'s take a quick tour!',
      position: 'bottom'
    },
    {
      target: 'create-game',
      title: 'Create a New Game',
      description: 'Click here to start your own squares pool. You can choose a sport, set the price per square, and invite friends.',
      position: 'bottom'
    },
    {
      target: 'join-game',
      title: 'Join with a Code',
      description: 'Have a 6-digit game code? Enter it here to join a friend\'s game instantly.',
      position: 'bottom'
    },
    {
      target: 'my-games',
      title: 'Your Games',
      description: 'All the games you\'ve created will appear here. You can manage, share, or delete them anytime.',
      position: 'top'
    },
    {
      target: 'profile-dropdown',
      title: 'Your Profile',
      description: 'Click here to update your display name, change the theme, or sign out.',
      position: 'bottom'
    }
  ];

  currentUser = this.authService.currentUser;
  canCreateGame = this.authService.canCreateGame;

  myGames = signal<GameListItem[]>([]);
  joinedGames = signal<GameListItem[]>([]);
  isLoadingGames = signal(true);
  isCreating = signal(false);
  showCreateModal = signal(false);
  shareModalGameId = signal<string | null>(null);
  espnGames = signal<EspnGame[]>([]);
  isLoadingEspnGames = signal(false);
  copiedToClipboard = signal(false);
  gameNameError = signal(false);

  // Edit modal state
  showEditModal = signal(false);
  editingGame = signal<GameListItem | null>(null);
  editGameName = '';
  editGameVenmoUsername = '';
  editGamePrice = 10;
  editSport: SportType = 'nfl';
  editEspnGameId = '';
  editEspnGames = signal<EspnGame[]>([]);
  isLoadingEditEspnGames = signal(false);
  editGamePlayers = signal<{ name: string; uid: string }[]>([]);
  managerSearchQuery = '';
  managerSearchResults = signal<{ name: string; uid: string }[]>([]);
  selectedManagerIndex = signal(-1);
  showManagerDropdown = signal(false);
  isSavingGame = signal(false);

  // Profile dropdown state
  showProfileDropdown = signal(false);
  profileName = '';
  isSavingProfile = signal(false);

  newGameName = '';
  newGameVenmoUsername = '';
  newGamePaymentManager = '';
  joinGameCode = '';
  selectedSport: SportType = 'nfl';
  selectedEspnGameId = '';
  newGamePrice = 10;
  customPrice: number | null = null;

  pricePresets = [0, 5, 10, 20, 50];
  sportOptions: { value: SportType; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'ncaaf', label: 'NCAA Football' },
    { value: 'nba', label: 'NBA' },
    { value: 'wnba', label: 'WNBA' },
    { value: 'afl', label: 'AFL' }
  ];

  ngOnInit(): void {
    this.loadMyGames();
    setTimeout(() => {
      this.walkthroughService.startIfNew('dashboard', this.dashboardWalkthroughSteps);
    }, 500);
  }

  startWalkthrough(): void {
    this.walkthroughService.resetCompletion('dashboard');
    this.walkthroughService.start('dashboard', this.dashboardWalkthroughSteps);
  }

  async loadMyGames(): Promise<void> {
    const user = this.currentUser();
    if (user && !user.isGuest) {
      this.isLoadingGames.set(true);
      try {
        const [owned, joined] = await Promise.all([
          this.gameService.getUserGames(user.uid),
          this.gameService.getJoinedGames(user.uid)
        ]);
        this.myGames.set(owned);
        this.joinedGames.set(joined);
      } catch (error) {
        this.toastService.error('Failed to load games');
      } finally {
        this.isLoadingGames.set(false);
      }
    } else {
      this.isLoadingGames.set(false);
    }
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.fetchEspnGames();
  }

  async fetchEspnGames(): Promise<void> {
    this.isLoadingEspnGames.set(true);
    try {
      const games = await this.espnService.getGames(this.selectedSport);
      this.espnGames.set(games);
    } finally {
      this.isLoadingEspnGames.set(false);
    }
  }

  selectSport(sport: SportType): void {
    this.selectedSport = sport;
    this.selectedEspnGameId = '';
    this.fetchEspnGames();
  }

  selectEspnGame(gameId: string): void {
    this.selectedEspnGameId = gameId;
  }

  selectPrice(price: number): void {
    this.newGamePrice = price;
    this.customPrice = null;
  }

  onCustomPriceChange(): void {
    if (this.customPrice !== null && this.customPrice >= 0) {
      this.newGamePrice = this.customPrice;
    }
  }

  getGameStatusClass(status: string): string {
    switch (status) {
      case 'pre': return 'bg-primary-200 text-primary-700';
      case 'in': return 'bg-red-100 text-red-700';
      case 'post': return 'bg-green-100 text-green-700';
      default: return 'bg-primary-200 text-primary-700';
    }
  }

  getGameStatusText(game: EspnGame): string {
    if (game.status === 'pre') return 'Upcoming';
    if (game.status === 'in') return `LIVE - Q${game.period} ${game.clock}`;
    return 'Final';
  }

  async createGame(): Promise<void> {
    const user = this.currentUser();
    if (!user || user.isGuest) return;

    // Validate game name is required
    const sanitizedName = this.sanitizationService.sanitizeGameName(this.newGameName);
    if (!sanitizedName) {
      this.gameNameError.set(true);
      return;
    }
    this.gameNameError.set(false);

    const sanitizedPrice = this.sanitizationService.validatePrice(this.newGamePrice);

    this.isCreating.set(true);
    try {
      let homeTeam: string | undefined;
      let awayTeam: string | undefined;
      if (this.selectedEspnGameId) {
        const espnGame = this.espnGames().find(g => g.id === this.selectedEspnGameId);
        if (espnGame) {
          homeTeam = espnGame.homeTeam;
          awayTeam = espnGame.awayTeam;
        }
      }

      const sanitizedVenmo = this.sanitizationService.sanitizeVenmoUsername(this.newGameVenmoUsername);

      const gameId = await this.gameService.createGame(
        user.uid,
        user.displayName || 'Unknown',
        sanitizedName,
        this.selectedEspnGameId || undefined,
        homeTeam,
        awayTeam,
        sanitizedPrice,
        this.selectedEspnGameId ? this.selectedSport : undefined,
        this.newGamePaymentManager.trim() || undefined,
        sanitizedVenmo || undefined
      );
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      this.toastService.error('Failed to create game');
    } finally {
      this.isCreating.set(false);
      this.showCreateModal.set(false);
      this.resetCreateForm();
    }
  }

  resetCreateForm(): void {
    this.newGameName = '';
    this.newGameVenmoUsername = '';
    this.newGamePaymentManager = '';
    this.selectedSport = 'nfl';
    this.selectedEspnGameId = '';
    this.newGamePrice = 10;
    this.customPrice = null;
    this.gameNameError.set(false);
  }

  joinGame(): void {
    if (this.joinGameCode.length === 6) {
      this.router.navigate(['/game', this.joinGameCode.toUpperCase()]);
    }
  }

  openGame(gameId: string): void {
    this.router.navigate(['/game', gameId]);
  }

  shareGame(gameId: string): void {
    this.shareModalGameId.set(gameId);
  }

  async deleteGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    if (confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      try {
        await this.gameService.deleteGame(gameId, user.uid);
        this.myGames.update(games => games.filter(g => g.id !== gameId));
      } catch (error) {
        this.toastService.error('Failed to delete game');
      }
    }
  }

  getShareLink(gameId: string): string {
    return this.gameService.getShareableLink(gameId);
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedToClipboard.set(true);
      setTimeout(() => this.copiedToClipboard.set(false), 2000);
    } catch (error) {
      this.toastService.error('Failed to copy');
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  formatGameDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/']);
  }

  // Edit modal methods
  async openEditModal(game: GameListItem): Promise<void> {
    this.editingGame.set(game);
    this.editGameName = game.name;
    this.editGameVenmoUsername = game.venmoUsername || '';
    this.editGamePrice = game.pricePerSquare;
    this.editSport = game.espnSport || 'nfl';
    this.editEspnGameId = game.espnEventId || '';
    this.managerSearchQuery = '';
    this.managerSearchResults.set([]);
    this.selectedManagerIndex.set(-1);
    this.showManagerDropdown.set(false);
    this.showEditModal.set(true);
    this.fetchEditEspnGames();

    const fullGame = await this.gameService.getGame(game.id);
    if (fullGame?.playerUserIds) {
      const currentUid = this.currentUser()?.uid;
      const players = Object.entries(fullGame.playerUserIds)
        .filter(([, uid]) => uid !== currentUid)
        .map(([name, uid]) => ({ name, uid }));
      this.editGamePlayers.set(players);
    } else {
      this.editGamePlayers.set([]);
    }
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGame.set(null);
    this.managerSearchQuery = '';
    this.managerSearchResults.set([]);
    this.editGamePlayers.set([]);
    this.showManagerDropdown.set(false);
    this.editEspnGames.set([]);
  }

  async fetchEditEspnGames(): Promise<void> {
    this.isLoadingEditEspnGames.set(true);
    try {
      const games = await this.espnService.getGames(this.editSport);
      this.editEspnGames.set(games);
    } finally {
      this.isLoadingEditEspnGames.set(false);
    }
  }

  selectEditSport(sport: SportType): void {
    this.editSport = sport;
    this.editEspnGameId = '';
    this.fetchEditEspnGames();
  }

  selectEditEspnGame(gameId: string): void {
    this.editEspnGameId = gameId;
  }

  onManagerSearchInput(): void {
    const query = this.managerSearchQuery.toLowerCase().trim();
    if (!query) {
      this.managerSearchResults.set(this.editGamePlayers());
    } else {
      this.managerSearchResults.set(
        this.editGamePlayers().filter(p => p.name.toLowerCase().includes(query))
      );
    }
    this.selectedManagerIndex.set(-1);
    this.showManagerDropdown.set(true);
  }

  onManagerSearchFocus(): void {
    const query = this.managerSearchQuery.toLowerCase().trim();
    if (!query) {
      this.managerSearchResults.set(this.editGamePlayers());
    }
    this.showManagerDropdown.set(true);
  }

  onManagerSearchKeydown(event: KeyboardEvent): void {
    const results = this.managerSearchResults();
    if (!results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedManagerIndex.update(i => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedManagerIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.selectedManagerIndex();
      if (idx >= 0 && idx < results.length) {
        this.assignManagerFromPlayer(results[idx]);
      }
    } else if (event.key === 'Escape') {
      this.showManagerDropdown.set(false);
    }
  }

  async assignManagerFromPlayer(player: { name: string; uid: string }): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    try {
      await this.gameService.updateGameManager(game.id, player.uid, null, player.name);
      this.editingGame.set({ ...game, managerId: player.uid, managerName: player.name, managerEmail: undefined });
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? { ...g, managerId: player.uid, managerName: player.name, managerEmail: undefined } : g)
      );
      this.managerSearchQuery = '';
      this.showManagerDropdown.set(false);
    } catch (error) {
      this.toastService.error('Failed to assign manager');
    }
  }

  async removeManager(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    try {
      await this.gameService.updateGameManager(game.id, null, null, null);
      this.editingGame.set({ ...game, managerId: undefined, managerEmail: undefined, managerName: undefined });
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? { ...g, managerId: undefined, managerEmail: undefined, managerName: undefined } : g)
      );
    } catch (error) {
      this.toastService.error('Failed to remove manager');
    }
  }

  async saveGameEdits(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    const sanitizedName = this.sanitizationService.sanitizeGameName(this.editGameName);
    const sanitizedPrice = this.sanitizationService.validatePrice(this.editGamePrice);
    const sanitizedVenmo = this.sanitizationService.sanitizeVenmoUsername(this.editGameVenmoUsername);

    this.isSavingGame.set(true);
    try {
      const selectedEspnGame = this.editEspnGames().find(g => g.id === this.editEspnGameId);
      const espnChanged = (this.editEspnGameId || undefined) !== game.espnEventId;
      const updates: Record<string, any> = {
        name: sanitizedName,
        pricePerSquare: sanitizedPrice,
        venmoUsername: sanitizedVenmo,
        espnEventId: this.editEspnGameId || undefined,
        espnSport: this.editEspnGameId ? this.editSport : undefined,
        homeTeam: selectedEspnGame?.homeTeam || game.homeTeam,
        awayTeam: selectedEspnGame?.awayTeam || game.awayTeam
      };
      if (espnChanged) {
        updates['scores'] = { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } };
        updates['winners'] = {};
      }
      await this.gameService.updateGame(game.id, updates);
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? {
          ...g,
          name: sanitizedName,
          pricePerSquare: sanitizedPrice,
          venmoUsername: sanitizedVenmo,
          espnEventId: this.editEspnGameId || undefined,
          espnSport: this.editEspnGameId ? this.editSport : undefined,
          homeTeam: selectedEspnGame?.homeTeam || game.homeTeam,
          awayTeam: selectedEspnGame?.awayTeam || game.awayTeam,
          ...(espnChanged ? { scores: { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } }, winners: {} } : {})
        } : g)
      );
      this.closeEditModal();
    } catch (error) {
      this.toastService.error('Failed to save changes');
    } finally {
      this.isSavingGame.set(false);
    }
  }

  // Profile dropdown methods
  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    const isOpening = !this.showProfileDropdown();
    this.showProfileDropdown.set(isOpening);
    if (isOpening) {
      const user = this.currentUser();
      this.profileName = user?.displayName || '';
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showProfileDropdown()) {
      this.showProfileDropdown.set(false);
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

      // Propagate name change to all games
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
}
