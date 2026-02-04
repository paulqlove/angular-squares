import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem } from '../../core/services/game.service';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
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
  heroCog6Tooth
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
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
      heroCog6Tooth
    })
  ],
  template: `
    <div class="min-h-screen bg-primary-100">
      <!-- Dark Header -->
      <header class="bg-primary-800 shadow-lg">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <img src="assets/logo.png" alt="Logo" class="h-10 w-auto drop-shadow-lg">
            <div>
              <h1 class="text-xl font-bold text-white tracking-tight">Football Squares</h1>
              <p class="text-xs text-primary-300">Super Bowl Squares Pool</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              (click)="openProfileModal()"
              class="flex items-center gap-2 bg-primary-700/50 hover:bg-primary-700 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
              title="Edit profile"
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
              <span class="text-sm font-medium text-white hidden sm:inline">
                {{ currentUser()?.displayName || currentUser()?.email }}
              </span>
              @if (currentUser()?.isGuest) {
                <span class="text-xs bg-primary-600 text-primary-200 px-2 py-0.5 rounded-full">Guest</span>
              }
            </button>

            <button
              (click)="signOut()"
              class="p-2 text-primary-300 hover:text-white hover:bg-primary-700 rounded-full transition-colors"
              title="Sign out"
            >
              <ng-icon name="heroArrowRightOnRectangle" class="text-xl"></ng-icon>
            </button>
          </div>
        </div>
      </header>

      <main class="container mx-auto px-4 py-8">
        <!-- Hero Section -->
        <div class="bg-gradient-to-br from-primary-700 to-primary-800 rounded-2xl shadow-xl p-8 mb-8">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-3xl">🏈</span>
            <h2 class="text-2xl font-bold text-white tracking-tight">Start or Join a Game</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Create Game Card -->
            @if (canCreateGame()) {
              <button
                (click)="openCreateModal()"
                class="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div class="w-12 h-12 rounded-xl bg-secondary-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ng-icon name="heroPlus" class="text-2xl text-white"></ng-icon>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-white">New Game</h3>
                    <p class="text-sm text-primary-200">Create a squares pool</p>
                  </div>
                </div>
                <p class="text-sm text-primary-300">Set up your own game with custom settings and share it with friends.</p>
              </button>
            } @else {
              <div class="bg-amber-500/20 backdrop-blur border border-amber-400/30 rounded-xl p-6">
                <div class="flex items-center gap-4 mb-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                    <ng-icon name="heroUserGroup" class="text-2xl text-white"></ng-icon>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-white">Guest Mode</h3>
                    <p class="text-sm text-amber-200">Sign in to create games</p>
                  </div>
                </div>
                <p class="text-sm text-amber-100 mb-4">Create an account to host your own squares pools.</p>
                <button
                  (click)="signOut()"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            }

            <!-- Join Game Card -->
            <div class="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center">
                  <ng-icon name="heroTicket" class="text-2xl text-white"></ng-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">Join with Code</h3>
                  <p class="text-sm text-primary-200">Have a 6-digit code?</p>
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="joinGameCode"
                  placeholder="XXXXXX"
                  class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-primary-400 uppercase tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  maxlength="6"
                  (keyup.enter)="joinGame()"
                />
                <button
                  (click)="joinGame()"
                  [disabled]="joinGameCode.length !== 6"
                  class="px-4 py-3 bg-accent-500 hover:bg-accent-400 disabled:bg-primary-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <ng-icon name="heroArrowRight" class="text-xl"></ng-icon>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- My Games Section -->
        @if (canCreateGame()) {
          <div class="mb-4">
            <h2 class="text-xl font-bold text-primary-800 tracking-tight">My Games</h2>
          </div>

          @if (isLoadingGames()) {
            <div class="flex items-center justify-center py-16">
              <svg class="animate-spin h-10 w-10 text-secondary-500" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          } @else if (myGames().length === 0) {
            <div class="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div class="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <ng-icon name="heroSquares2x2" class="text-4xl text-primary-400"></ng-icon>
              </div>
              <h3 class="text-lg font-semibold text-primary-800 mb-2">No games yet</h3>
              <p class="text-primary-500 mb-6">Create your first squares pool to get started!</p>
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
                <div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <!-- Game Header -->
                  <div class="bg-gradient-to-r from-primary-700 to-primary-800 p-4">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="font-bold text-white truncate">{{ game.name }}</h3>
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
                    <p class="text-sm text-primary-200">
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
                    <div class="mb-4">
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-primary-600">Squares Filled</span>
                        <span class="font-semibold text-primary-800">{{ game.squaresFilled }}/100</span>
                      </div>
                      <div class="h-2 bg-primary-100 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-gradient-to-r from-secondary-400 to-secondary-500 rounded-full transition-all duration-500"
                          [style.width.%]="game.squaresFilled"
                        ></div>
                      </div>
                    </div>

                    <!-- Stats Row -->
                    <div class="flex items-center gap-4 text-sm text-primary-500 mb-4">
                      <span class="flex items-center gap-1">
                        <ng-icon name="heroUserGroup" class="text-base"></ng-icon>
                        {{ game.playerCount }} players
                      </span>
                      <span class="text-primary-300">|</span>
                      <span class="font-mono text-xs bg-primary-100 px-2 py-0.5 rounded">{{ game.id }}</span>
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
                        class="p-2.5 text-primary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-xl transition-colors"
                        title="Share game"
                      >
                        <ng-icon name="heroShare" class="text-lg"></ng-icon>
                      </button>
                      <button
                        (click)="openEditModal(game)"
                        class="p-2.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                        title="Edit game"
                      >
                        <ng-icon name="heroCog6Tooth" class="text-lg"></ng-icon>
                      </button>
                      <button
                        (click)="deleteGame(game.id)"
                        class="p-2.5 text-primary-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete game"
                      >
                        <ng-icon name="heroTrash" class="text-lg"></ng-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="px-4 py-3 bg-primary-50 border-t border-primary-100">
                    <span class="text-xs text-primary-400">Created {{ formatDate(game.createdAt) }}</span>
                  </div>
                </div>
              }
            </div>
          }
        }
      </main>

      <!-- Create Game Modal -->
      @if (showCreateModal()) {
        <div
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          (click)="showCreateModal.set(false)"
        >
          <div
            class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-in"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-primary-100">
              <div>
                <h3 class="text-xl font-bold text-primary-800">Create New Game</h3>
                <p class="text-sm text-primary-500">Set up your squares pool</p>
              </div>
              <button
                (click)="showCreateModal.set(false)"
                class="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-6">
              <!-- Sport Tabs -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-3">Sport</label>
                <div class="flex gap-2">
                  @for (sport of sportOptions; track sport.value) {
                    <button
                      (click)="selectSport(sport.value)"
                      [class]="selectedSport === sport.value
                        ? 'px-6 py-2.5 bg-primary-800 text-white rounded-lg font-medium transition-colors'
                        : 'px-6 py-2.5 bg-primary-100 text-primary-600 hover:bg-primary-200 rounded-lg font-medium transition-colors'"
                    >
                      {{ sport.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Game Selection -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-3">Select Game</label>
                @if (isLoadingEspnGames()) {
                  <div class="flex items-center justify-center py-8">
                    <svg class="animate-spin h-6 w-6 text-secondary-500" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    <!-- Manual Scores Option -->
                    <button
                      (click)="selectEspnGame('')"
                      [class]="selectedEspnGameId === ''
                        ? 'p-4 border-2 border-secondary-500 bg-secondary-50 rounded-xl text-left transition-all'
                        : 'p-4 border-2 border-primary-200 hover:border-primary-300 rounded-xl text-left transition-all'"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary-200 flex items-center justify-center">
                          <ng-icon name="heroPencilSquare" class="text-lg text-primary-600"></ng-icon>
                        </div>
                        <div>
                          <p class="font-semibold text-primary-800">Manual Scores</p>
                          <p class="text-xs text-primary-500">Enter scores yourself</p>
                        </div>
                      </div>
                    </button>

                    <!-- ESPN Games -->
                    @for (game of espnGames(); track game.id) {
                      <button
                        (click)="selectEspnGame(game.id)"
                        [class]="selectedEspnGameId === game.id
                          ? 'p-4 border-2 border-secondary-500 bg-secondary-50 rounded-xl text-left transition-all'
                          : 'p-4 border-2 border-primary-200 hover:border-primary-300 rounded-xl text-left transition-all'"
                      >
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="getGameStatusClass(game.status)">
                            {{ getGameStatusText(game) }}
                          </span>
                        </div>
                        <p class="font-semibold text-primary-800 text-sm">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                        @if (game.status !== 'pre') {
                          <p class="text-xs text-primary-500 mt-1">{{ game.awayScore }} - {{ game.homeScore }}</p>
                        }
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Price Selection -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-3">Price per Square</label>
                <div class="flex flex-wrap gap-2">
                  @for (price of pricePresets; track price) {
                    <button
                      (click)="selectPrice(price)"
                      [class]="newGamePrice === price
                        ? 'px-5 py-2.5 bg-secondary-500 text-white rounded-lg font-medium transition-colors'
                        : 'px-5 py-2.5 bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg font-medium transition-colors'"
                    >
                      {{ price === 0 ? 'Free' : '$' + price }}
                    </button>
                  }
                  <div class="flex items-center gap-1 px-3 py-2 bg-primary-100 rounded-lg">
                    <span class="text-primary-500">$</span>
                    <input
                      type="number"
                      [(ngModel)]="customPrice"
                      (ngModelChange)="onCustomPriceChange()"
                      placeholder="Custom"
                      min="0"
                      class="w-16 bg-transparent text-primary-800 font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <!-- Game Name -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-3">Game Name <span class="text-primary-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  [(ngModel)]="newGameName"
                  placeholder="e.g., Super Bowl Party 2024"
                  class="w-full px-4 py-3 border border-primary-200 rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                />
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-primary-100 bg-primary-50">
              <button
                (click)="showCreateModal.set(false)"
                class="px-6 py-2.5 text-primary-600 hover:bg-primary-200 rounded-xl font-medium transition-colors"
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
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-in" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-primary-100">
              <h3 class="text-xl font-bold text-primary-800">Share Game</h3>
              <button
                (click)="shareModalGameId.set(null)"
                class="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <div class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-2">Game Code</label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 bg-primary-100 px-4 py-4 rounded-xl font-mono text-2xl tracking-widest text-center text-primary-800">
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
                <label class="block text-sm font-semibold text-primary-700 mb-2">Share Link</label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="getShareLink(shareModalGameId()!)"
                    readonly
                    class="flex-1 px-4 py-3 bg-primary-100 rounded-xl text-sm truncate text-primary-600"
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
                <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
                  Copied to clipboard!
                </div>
              }
            </div>

            <div class="p-6 border-t border-primary-100 bg-primary-50 rounded-b-2xl">
              <button
                (click)="shareModalGameId.set(null)"
                class="w-full px-4 py-3 bg-primary-200 hover:bg-primary-300 text-primary-700 rounded-xl font-medium transition-colors"
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
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-in" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-primary-100">
              <div>
                <h3 class="text-xl font-bold text-primary-800">Edit Game</h3>
                <p class="text-sm text-primary-500">{{ editingGame()?.id }}</p>
              </div>
              <button
                (click)="closeEditModal()"
                class="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <div class="p-6 space-y-5">
              <!-- Game Name -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-2">Game Name</label>
                <input
                  type="text"
                  [(ngModel)]="editGameName"
                  placeholder="e.g., Super Bowl Party 2024"
                  class="w-full px-4 py-3 border border-primary-200 rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                />
              </div>

              <!-- Price Per Square -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-2">Price Per Square</label>
                <div class="flex items-center gap-2">
                  <span class="text-primary-500">$</span>
                  <input
                    type="number"
                    [(ngModel)]="editGamePrice"
                    min="0"
                    class="flex-1 px-4 py-3 border border-primary-200 rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                  />
                </div>
              </div>

              <!-- Manager Assignment -->
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-2">
                  Payment Manager
                  <span class="text-primary-400 font-normal">(optional)</span>
                </label>
                <p class="text-xs text-primary-500 mb-2">Assign someone to help manage payments. They can mark who has paid.</p>
                @if (editingGame()?.managerEmail) {
                  <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <span class="flex-1 text-green-700">{{ editingGame()?.managerEmail }}</span>
                    <button
                      (click)="removeManager()"
                      class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                } @else {
                  <div class="flex gap-2">
                    <input
                      type="email"
                      [(ngModel)]="managerEmail"
                      placeholder="Enter their email address"
                      class="flex-1 px-4 py-3 border border-primary-200 rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                    />
                    <button
                      (click)="lookupAndAssignManager()"
                      [disabled]="!managerEmail || isLookingUpManager()"
                      class="px-4 py-3 bg-secondary-500 hover:bg-secondary-600 disabled:bg-primary-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                    >
                      @if (isLookingUpManager()) {
                        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      } @else {
                        Assign
                      }
                    </button>
                  </div>
                  @if (managerLookupError()) {
                    <p class="mt-2 text-sm text-red-600">{{ managerLookupError() }}</p>
                  }
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-6 border-t border-primary-100 bg-primary-50 rounded-b-2xl">
              <button
                (click)="closeEditModal()"
                class="px-6 py-2.5 text-primary-600 hover:bg-primary-200 rounded-xl font-medium transition-colors"
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

      <!-- Profile Edit Modal -->
      @if (showProfileModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="showProfileModal.set(false)">
          <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-modal-in" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-primary-100">
              <h3 class="text-xl font-bold text-primary-800">Edit Profile</h3>
              <button
                (click)="showProfileModal.set(false)"
                class="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
              </button>
            </div>

            <div class="p-6">
              <div>
                <label class="block text-sm font-semibold text-primary-700 mb-2">Display Name</label>
                <input
                  type="text"
                  [(ngModel)]="profileName"
                  placeholder="Enter your name"
                  class="w-full px-4 py-3 border border-primary-200 rounded-xl focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                  (keyup.enter)="saveProfile()"
                />
                @if (currentUser()?.email) {
                  <p class="text-xs text-primary-500 mt-2">{{ currentUser()?.email }}</p>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-6 border-t border-primary-100 bg-primary-50 rounded-b-2xl">
              <button
                (click)="showProfileModal.set(false)"
                class="px-6 py-2.5 text-primary-600 hover:bg-primary-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="saveProfile()"
                [disabled]="isSavingProfile() || !profileName.trim()"
                class="px-8 py-2.5 bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
              >
                @if (isSavingProfile()) {
                  Saving...
                } @else {
                  Save
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

  currentUser = this.authService.currentUser;
  canCreateGame = this.authService.canCreateGame;

  myGames = signal<GameListItem[]>([]);
  isLoadingGames = signal(true);
  isCreating = signal(false);
  showCreateModal = signal(false);
  shareModalGameId = signal<string | null>(null);
  espnGames = signal<EspnGame[]>([]);
  isLoadingEspnGames = signal(false);
  copiedToClipboard = signal(false);

  // Edit modal state
  showEditModal = signal(false);
  editingGame = signal<GameListItem | null>(null);
  editGameName = '';
  editGamePrice = 10;
  managerEmail = '';
  managerLookupError = signal<string | null>(null);
  isLookingUpManager = signal(false);
  isSavingGame = signal(false);

  // Profile edit state
  showProfileModal = signal(false);
  profileName = '';
  isSavingProfile = signal(false);

  newGameName = '';
  joinGameCode = '';
  selectedSport: SportType = 'nfl';
  selectedEspnGameId = '';
  newGamePrice = 10;
  customPrice: number | null = null;

  pricePresets = [0, 5, 10, 20, 50];
  sportOptions: { value: SportType; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'nba', label: 'NBA' }
  ];

  ngOnInit(): void {
    this.loadMyGames();
  }

  async loadMyGames(): Promise<void> {
    const user = this.currentUser();
    if (user && !user.isGuest) {
      this.isLoadingGames.set(true);
      try {
        const games = await this.gameService.getUserGames(user.uid);
        this.myGames.set(games);
      } catch (error) {
        console.error('Failed to load games:', error);
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

      const gameId = await this.gameService.createGame(
        user.uid,
        user.displayName || 'Unknown',
        this.newGameName.trim() || undefined,
        this.selectedEspnGameId || undefined,
        homeTeam,
        awayTeam,
        this.newGamePrice,
        this.selectedEspnGameId ? this.selectedSport : undefined
      );
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      this.isCreating.set(false);
      this.showCreateModal.set(false);
      this.resetCreateForm();
    }
  }

  resetCreateForm(): void {
    this.newGameName = '';
    this.selectedSport = 'nfl';
    this.selectedEspnGameId = '';
    this.newGamePrice = 10;
    this.customPrice = null;
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
        console.error('Failed to delete game:', error);
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
      console.error('Failed to copy:', error);
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/']);
  }

  // Edit modal methods
  openEditModal(game: GameListItem): void {
    this.editingGame.set(game);
    this.editGameName = game.name;
    this.editGamePrice = game.pricePerSquare;
    this.managerEmail = '';
    this.managerLookupError.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGame.set(null);
    this.managerEmail = '';
    this.managerLookupError.set(null);
  }

  async lookupAndAssignManager(): Promise<void> {
    if (!this.managerEmail || !this.editingGame()) return;

    this.isLookingUpManager.set(true);
    this.managerLookupError.set(null);

    try {
      const managerId = await this.authService.lookupUserByEmail(this.managerEmail);
      if (!managerId) {
        this.managerLookupError.set('No account found with this email. They need to sign in first.');
        return;
      }

      const game = this.editingGame()!;
      if (managerId === this.currentUser()?.uid) {
        this.managerLookupError.set('You cannot assign yourself as manager.');
        return;
      }

      await this.gameService.updateGameManager(game.id, managerId, this.managerEmail);
      // Update local state
      this.editingGame.set({ ...game, managerId, managerEmail: this.managerEmail });
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? { ...g, managerId, managerEmail: this.managerEmail } : g)
      );
      this.managerEmail = '';
    } catch (error) {
      this.managerLookupError.set('Failed to assign manager. Please try again.');
    } finally {
      this.isLookingUpManager.set(false);
    }
  }

  async removeManager(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    try {
      await this.gameService.updateGameManager(game.id, null, null);
      this.editingGame.set({ ...game, managerId: undefined, managerEmail: undefined });
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? { ...g, managerId: undefined, managerEmail: undefined } : g)
      );
    } catch (error) {
      console.error('Failed to remove manager:', error);
    }
  }

  async saveGameEdits(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    this.isSavingGame.set(true);
    try {
      await this.gameService.updateGame(game.id, {
        name: this.editGameName,
        pricePerSquare: this.editGamePrice
      });
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? { ...g, name: this.editGameName, pricePerSquare: this.editGamePrice } : g)
      );
      this.closeEditModal();
    } catch (error) {
      console.error('Failed to save game:', error);
    } finally {
      this.isSavingGame.set(false);
    }
  }

  // Profile modal methods
  openProfileModal(): void {
    const user = this.currentUser();
    this.profileName = user?.displayName || '';
    this.showProfileModal.set(true);
  }

  async saveProfile(): Promise<void> {
    if (!this.profileName.trim()) return;

    this.isSavingProfile.set(true);
    try {
      const user = this.currentUser();
      if (user?.isGuest) {
        this.authService.updateGuestName(this.profileName);
      } else {
        await this.authService.updateDisplayName(this.profileName);
      }
      this.showProfileModal.set(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      this.isSavingProfile.set(false);
    }
  }
}
