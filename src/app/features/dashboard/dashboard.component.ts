import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem } from '../../core/services/game.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroPlus,
  heroArrowRightOnRectangle,
  heroSquares2x2,
  heroShare,
  heroTrash,
  heroLockClosed,
  heroUserGroup,
  heroArrowTopRightOnSquare
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
      heroArrowTopRightOnSquare
    })
  ],
  template: `
    <div class="min-h-screen bg-page">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <img src="assets/logo.png" alt="Logo" class="h-8 w-auto">
            <h1 class="text-xl font-bold text-heading">Football Squares</h1>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              @if (currentUser()?.photoURL) {
                <img
                  [src]="currentUser()?.photoURL"
                  alt="Profile"
                  class="w-8 h-8 rounded-full"
                />
              } @else {
                <div class="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center">
                  <span class="text-secondary-600 font-medium text-sm">
                    {{ currentUser()?.displayName?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </div>
              }
              <span class="text-sm font-medium text-default hidden sm:inline">
                {{ currentUser()?.displayName }}
              </span>
              @if (currentUser()?.isGuest) {
                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Guest</span>
              }
            </div>

            <button
              (click)="signOut()"
              class="p-2 text-muted hover:text-heading rounded-lg hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <ng-icon name="heroArrowRightOnRectangle" class="text-xl"></ng-icon>
            </button>
          </div>
        </div>
      </header>

      <main class="container mx-auto px-4 py-8">
        <!-- Create Game Section -->
        @if (canCreateGame()) {
          <div class="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 class="text-lg font-semibold text-heading mb-4">Create New Game</h2>

            @if (!showCreateForm()) {
              <button
                (click)="showCreateForm.set(true)"
                class="flex items-center gap-2 px-4 py-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
              >
                <ng-icon name="heroPlus" class="text-xl"></ng-icon>
                New Game
              </button>
            } @else {
              <div class="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  [(ngModel)]="newGameName"
                  placeholder="Game name (optional)"
                  class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none"
                />
                <div class="flex gap-2">
                  <button
                    (click)="createGame()"
                    [disabled]="isCreating()"
                    class="px-4 py-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    @if (isCreating()) {
                      Creating...
                    } @else {
                      Create
                    }
                  </button>
                  <button
                    (click)="showCreateForm.set(false)"
                    class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <h2 class="text-lg font-semibold text-amber-800 mb-2">Guest Mode</h2>
            <p class="text-amber-700 mb-4">
              Sign in with Google or create an account to create your own games.
            </p>
            <button
              (click)="signOut()"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        }

        <!-- Join Game Section -->
        <div class="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 class="text-lg font-semibold text-heading mb-4">Join a Game</h2>
          <div class="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              [(ngModel)]="joinGameCode"
              placeholder="Enter game code"
              class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none uppercase tracking-widest font-mono"
              maxlength="6"
              (keyup.enter)="joinGame()"
            />
            <button
              (click)="joinGame()"
              [disabled]="joinGameCode.length !== 6"
              class="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Join Game
            </button>
          </div>
        </div>

        <!-- My Games Section -->
        @if (canCreateGame()) {
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h2 class="text-lg font-semibold text-heading mb-4">My Games</h2>

            @if (isLoadingGames()) {
              <div class="flex items-center justify-center py-8">
                <svg class="animate-spin h-8 w-8 text-secondary-500" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
            } @else if (myGames().length === 0) {
              <div class="text-center py-8">
                <ng-icon name="heroSquares2x2" class="text-4xl text-gray-300 mb-3"></ng-icon>
                <p class="text-muted">No games yet. Create your first game above!</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (game of myGames(); track game.id) {
                  <div class="border border-gray-200 rounded-lg p-4 hover:border-secondary-300 transition-colors">
                    <div class="flex items-start justify-between mb-3">
                      <div>
                        <h3 class="font-medium text-heading">{{ game.name }}</h3>
                        <p class="text-sm text-muted">
                          @if (game.homeTeam && game.awayTeam) {
                            {{ game.awayTeam }} vs {{ game.homeTeam }}
                          } @else {
                            No teams set
                          }
                        </p>
                      </div>
                      @if (game.isLocked) {
                        <ng-icon name="heroLockClosed" class="text-amber-500"></ng-icon>
                      }
                    </div>

                    <div class="flex items-center gap-4 text-sm text-muted mb-4">
                      <span class="flex items-center gap-1">
                        <ng-icon name="heroUserGroup" class="text-base"></ng-icon>
                        {{ game.playerCount }} players
                      </span>
                      <span>{{ game.squaresFilled }}/100 squares</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        (click)="openGame(game.id)"
                        class="flex-1 px-3 py-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Open
                      </button>
                      <button
                        (click)="shareGame(game.id)"
                        class="p-2 text-muted hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                        title="Share game"
                      >
                        <ng-icon name="heroShare" class="text-lg"></ng-icon>
                      </button>
                      <button
                        (click)="deleteGame(game.id)"
                        class="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete game"
                      >
                        <ng-icon name="heroTrash" class="text-lg"></ng-icon>
                      </button>
                    </div>

                    <div class="mt-3 pt-3 border-t border-gray-100">
                      <div class="flex items-center justify-between text-xs text-muted">
                        <span>Code: <code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{{ game.id }}</code></span>
                        <span>{{ formatDate(game.createdAt) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </main>

      <!-- Share Modal -->
      @if (shareModalGameId()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="shareModalGameId.set(null)">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-heading mb-4">Share Game</h3>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-label mb-2">Game Code</label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-xl tracking-widest text-center">
                    {{ shareModalGameId() }}
                  </code>
                  <button
                    (click)="copyToClipboard(shareModalGameId()!)"
                    class="p-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-label mb-2">Share Link</label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="getShareLink(shareModalGameId()!)"
                    readonly
                    class="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm truncate"
                  />
                  <button
                    (click)="copyToClipboard(getShareLink(shareModalGameId()!))"
                    class="p-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              (click)="shareModalGameId.set(null)"
              class="w-full mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  currentUser = this.authService.currentUser;
  canCreateGame = this.authService.canCreateGame;

  myGames = signal<GameListItem[]>([]);
  isLoadingGames = signal(true);
  isCreating = signal(false);
  showCreateForm = signal(false);
  shareModalGameId = signal<string | null>(null);

  newGameName = '';
  joinGameCode = '';

  constructor(
    private authService: AuthService,
    private gameService: GameService,
    private router: Router
  ) {}

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

  async createGame(): Promise<void> {
    const user = this.currentUser();
    if (!user || user.isGuest) return;

    this.isCreating.set(true);
    try {
      const gameId = await this.gameService.createGame(
        user.uid,
        user.displayName || 'Unknown',
        this.newGameName.trim() || undefined
      );
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      this.isCreating.set(false);
      this.showCreateForm.set(false);
      this.newGameName = '';
    }
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
      // Could add a toast notification here
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
}
