import { Component, OnInit, signal, inject, HostListener, ChangeDetectionStrategy } from '@angular/core';

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem } from '../../core/services/game.service';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { HeadroomDirective } from '../../shared/directives/headroom.directive';
import { UpgradePassDialogComponent } from './components/upgrade-pass-dialog/upgrade-pass-dialog.component';
import { ActiveBoardLimitError } from '../../core/errors/active-board-limit.error';
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
    imports: [FormsModule, NgTemplateOutlet, NgIconComponent, AppHeaderComponent, HeadroomDirective, ProfileMenuComponent, ShareDialogComponent, UpgradePassDialogComponent],
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
    <div class="min-h-screen bg-page" [attr.inert]="showUpgradeDialog() ? '' : null">
      <!-- Header -->
      <app-shared-header variant="solid" appHeadroom>
        <!-- Help Button -->
        <button
          (click)="startWalkthrough()"
          class="p-2 text-header-muted hover:text-header rounded-lg hover:bg-header-accent transition-colors flex items-center justify-center"
          title="Show tutorial"
          aria-label="Show tutorial"
        >
          <ng-icon name="heroQuestionMarkCircle" class="text-xl"></ng-icon>
        </button>

        <app-profile-menu walkthroughTarget="profile-dropdown"></app-profile-menu>
      </app-shared-header>

      <main class="mx-auto max-w-[1600px] px-4 sm:px-8 pt-10 pb-20 md:pt-14">
        <!-- Heading + actions -->
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" data-walkthrough="hero-section">
          <div>
            <p class="qs-eyebrow">Dashboard</p>
            <h2 class="qs-title mt-3 text-4xl sm:text-5xl">Your <span class="text-qs-accent">games</span></h2>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <div
              class="flex min-h-11 items-stretch overflow-hidden rounded-btn border border-qs-line-strong bg-qs-panel focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-qs-ink"
              data-walkthrough="join-game"
            >
              <label for="join-code" class="qs-label flex items-center border-r border-qs-line bg-qs-panel-2 px-3 text-qs-muted whitespace-nowrap">Code</label>
              <input
                id="join-code"
                type="text"
                [(ngModel)]="joinGameCode"
                placeholder="ABC123"
                maxlength="6"
                autocomplete="off"
                class="w-full min-w-0 bg-transparent px-3 font-mono text-base uppercase tracking-[0.3em] text-qs-ink placeholder:text-qs-muted/60 focus:outline-none sm:w-36"
                (keyup.enter)="joinGame()"
              />
              <button
                type="button"
                (click)="joinGame()"
                [disabled]="joinGameCode.length !== 6"
                class="qs-btn qs-btn-ink rounded-none"
              >
                Join
              </button>
            </div>

            @if (canCreateGame()) {
              <button
                type="button"
                (click)="openCreateModal($event)"
                [disabled]="isCheckingBoardLimit()"
                [attr.aria-busy]="isCheckingBoardLimit()"
                class="qs-btn qs-btn-primary disabled:cursor-wait"
                data-walkthrough="create-game"
              >
                <ng-icon name="heroPlus" class="text-base"></ng-icon>
                New game
              </button>
            }
          </div>
        </div>

        @if (!canCreateGame()) {
          <div class="mt-8 flex flex-col gap-4 rounded-card border border-qs-line bg-qs-warn-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-qs-warn">
              <span class="font-semibold">You're playing as a guest.</span>
              Sign in with Google to host your own games.
            </p>
            <button type="button" (click)="signOut()" class="qs-btn qs-btn-ink shrink-0">Sign in</button>
          </div>
        }

        <!-- Hosting -->
        @if (canCreateGame()) {
          <section class="mt-12" data-walkthrough="my-games" aria-labelledby="hosting-heading">
            <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
              <h3 id="hosting-heading" class="qs-eyebrow qs-eyebrow-bar">01 / Hosting</h3>
              @if (!isLoadingGames()) {
                <span class="qs-label text-qs-muted">{{ myGames().length }} {{ myGames().length === 1 ? 'game' : 'games' }}</span>
              }
            </div>

            @if (isLoadingGames()) {
              <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                @for (i of [0, 1, 2]; track i) {
                  <div class="qs-card h-64 animate-pulse bg-qs-panel-2"></div>
                }
              </div>
            } @else if (myGames().length === 0) {
              <div class="qs-card mt-5 p-10 text-center">
                <p class="qs-title text-2xl">No games yet</p>
                <p class="mt-2 text-qs-muted">Create a board, share the code, and let everyone pick their squares.</p>
                <button
                  type="button"
                  (click)="openCreateModal($event)"
                  [disabled]="isCheckingBoardLimit()"
                  [attr.aria-busy]="isCheckingBoardLimit()"
                  class="qs-btn qs-btn-primary mt-6 disabled:cursor-wait"
                >
                  <ng-icon name="heroPlus" class="text-base"></ng-icon>
                  Create your first game
                </button>
              </div>
            } @else {
              <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                @for (game of myGames(); track game.id) {
                  <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: false }"></ng-container>
                }
              </div>
            }
          </section>
        }

        <!-- Joined -->
        @if (joinedGames().length > 0) {
          <section class="mt-12" aria-labelledby="joined-heading">
            <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
              <h3 id="joined-heading" class="qs-eyebrow qs-eyebrow-bar">{{ canCreateGame() ? '02' : '01' }} / Joined</h3>
              <span class="qs-label text-qs-muted">{{ joinedGames().length }} {{ joinedGames().length === 1 ? 'game' : 'games' }}</span>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (game of joinedGames(); track game.id) {
                <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: true }"></ng-container>
              }
            </div>
          </section>
        }
      </main>

      <ng-template #gameCard let-game let-joined="joined">
        <article class="qs-card flex flex-col p-5 transition-colors hover:border-qs-line-strong">
          <div class="flex items-center justify-between gap-3">
            <span class="qs-badge qs-badge-code font-mono">{{ game.id }}</span>
            @if (joined) {
              <span class="qs-label truncate text-qs-muted">Host · {{ game.ownerName }}</span>
            } @else if (game.isLocked) {
              <span class="qs-badge">
                <ng-icon name="heroLockClosed" class="text-xs"></ng-icon>
                Locked
              </span>
            } @else {
              <span class="qs-badge qs-badge-ok">Open</span>
            }
          </div>

          <h4 class="mt-4 truncate text-xl font-semibold tracking-tight text-qs-ink">{{ game.name }}</h4>
          <p class="mt-1 truncate text-sm text-qs-muted">
            @if (game.homeTeam && game.awayTeam) {
              {{ game.awayTeam }} vs {{ game.homeTeam }}
            } @else {
              Teams not set
            }
            · Created {{ formatDate(game.createdAt) }}
          </p>

          <div class="mt-5 flex items-center gap-5">
            <div class="grid w-[68px] shrink-0 grid-cols-10 gap-px rounded-[3px] bg-qs-line p-px" aria-hidden="true">
              @for (i of boardCells; track i) {
                <span class="aspect-square" [class]="i < game.squaresFilled ? 'bg-qs-accent' : 'bg-qs-panel'"></span>
              }
            </div>
            <dl class="grid flex-1 grid-cols-3 gap-3">
              <div>
                <dt class="qs-label text-[10px] text-qs-muted">Squares</dt>
                <dd class="mt-1 text-lg font-semibold tabular-nums text-qs-ink">{{ game.squaresFilled }}<span class="text-sm font-normal text-qs-muted">/100</span></dd>
              </div>
              <div>
                <dt class="qs-label text-[10px] text-qs-muted">Players</dt>
                <dd class="mt-1 text-lg font-semibold tabular-nums text-qs-ink">{{ game.playerCount }}</dd>
              </div>
              <div>
                <dt class="qs-label text-[10px] text-qs-muted">Confirmed</dt>
                <dd class="mt-1 text-lg font-semibold tabular-nums text-qs-ink">{{ game.confirmedCount }}<span class="text-sm font-normal text-qs-muted">/{{ game.playerCount }}</span></dd>
              </div>
            </dl>
          </div>

          <div class="mt-5 flex items-center gap-1 border-t border-qs-line pt-4">
            <button type="button" (click)="openGame(game.id)" class="qs-btn qs-btn-secondary mr-auto flex-1 hover:!border-qs-ink">Open game</button>
            <button type="button" (click)="shareGame(game.id)" class="qs-btn qs-btn-ghost w-11 px-0 text-qs-muted hover:text-qs-ink" title="Share game" aria-label="Share game">
              <ng-icon name="heroShare" class="text-lg"></ng-icon>
            </button>
            @if (!joined) {
              <button type="button" (click)="openEditModal(game)" class="qs-btn qs-btn-ghost w-11 px-0 text-qs-muted hover:text-qs-ink" title="Edit game" aria-label="Edit game">
                <ng-icon name="heroCog6Tooth" class="text-lg"></ng-icon>
              </button>
              <button type="button" (click)="deleteGame(game.id)" class="qs-btn qs-btn-ghost w-11 px-0 text-qs-muted hover:!bg-qs-bad-soft hover:text-qs-bad" title="Delete game" aria-label="Delete game">
                <ng-icon name="heroTrash" class="text-lg"></ng-icon>
              </button>
            }
          </div>
        </article>
      </ng-template>

      <!-- Create Game Modal -->
      @if (showCreateModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          (click)="showCreateModal.set(false)"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-game-title"
            class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-qs-line bg-qs-panel shadow-pop animate-modal-in"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-5 pt-6">
              <div>
                <p class="qs-eyebrow">New game</p>
                <h3 id="create-game-title" class="qs-title mt-2 text-3xl">Set up your <span class="text-qs-accent">board</span></h3>
              </div>
              <button
                type="button"
                (click)="showCreateModal.set(false)"
                class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink"
                aria-label="Close"
              >
                <ng-icon name="heroXMark" class="text-xl"></ng-icon>
              </button>
            </div>

            <div class="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              <!-- 01 Sport -->
              <section>
                <h4 class="qs-eyebrow qs-eyebrow-bar">01 / Sport</h4>
                <div class="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Sport">
                  @for (sport of sportOptions; track sport.value) {
                    <button
                      type="button"
                      role="tab"
                      class="qs-tab"
                      [attr.aria-selected]="selectedSport === sport.value"
                      (click)="selectSport(sport.value)"
                    >
                      {{ sport.label }}
                    </button>
                  }
                </div>
              </section>

              <!-- 02 Game -->
              <section>
                <h4 class="qs-eyebrow qs-eyebrow-bar">02 / Game</h4>
                @if (isLoadingEspnGames()) {
                  <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-busy="true">
                    @for (i of [0, 1, 2, 3]; track i) {
                      <div class="h-[76px] animate-pulse rounded-inner bg-qs-panel-2"></div>
                    }
                  </div>
                } @else if (espnGames().length === 0) {
                  <p class="mt-3 rounded-inner border border-dashed border-qs-line-strong p-4 text-sm text-qs-muted">No games on the schedule for this sport right now.</p>
                } @else if (!gameListOpen && selectedEspnGame(); as game) {
                  <!-- Picked: collapse to the choice so the rest of the form is right there -->
                  <div class="mt-3 flex items-center justify-between gap-3 rounded-inner border border-qs-accent bg-qs-panel p-3 outline outline-2 -outline-offset-2 outline-qs-accent">
                    <div class="min-w-0">
                      <span class="qs-badge" [class]="getGameStatusClass(game.status)">{{ getGameStatusText(game) }}</span>
                      <p class="mt-2 truncate font-semibold text-qs-ink">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                      @if (game.status === 'pre' && game.date) {
                        <p class="qs-label mt-1 text-[10px] text-qs-muted">{{ formatGameDate(game.date) }}</p>
                      }
                    </div>
                    <button type="button" (click)="gameListOpen = true" class="qs-btn qs-btn-secondary shrink-0 px-3">Change</button>
                  </div>
                } @else {
                  <div class="qs-canvas mt-3 max-h-80 overflow-y-auto overscroll-contain rounded-inner p-2 sm:max-h-72">
                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      @for (game of espnGames(); track game.id) {
                        <button
                          type="button"
                          (click)="selectEspnGame(game.id)"
                          [attr.aria-pressed]="selectedEspnGameId === game.id"
                          class="rounded-inner border bg-qs-panel p-3 text-left transition-colors"
                          [class]="selectedEspnGameId === game.id ? 'border-qs-accent outline outline-2 -outline-offset-2 outline-qs-accent' : 'border-qs-line hover:border-qs-line-strong'"
                        >
                          <div class="flex items-center justify-between gap-2">
                            <span class="qs-badge" [class]="getGameStatusClass(game.status)">{{ getGameStatusText(game) }}</span>
                            @if (selectedEspnGameId === game.id) {
                              <ng-icon name="heroCheckCircle" class="text-lg text-qs-accent"></ng-icon>
                            }
                          </div>
                          <p class="mt-2 truncate font-semibold text-qs-ink">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                          <p class="qs-label mt-1 text-[10px] text-qs-muted">
                            @if (game.status === 'pre' && game.date) {
                              {{ formatGameDate(game.date) }}
                            } @else if (game.status !== 'pre') {
                              {{ game.awayScore }} – {{ game.homeScore }}
                            }
                          </p>
                        </button>
                      }
                    </div>
                  </div>
                }
              </section>

              <!-- 03 Points -->
              <section>
                <h4 class="qs-eyebrow qs-eyebrow-bar">03 / Points per square</h4>
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (price of pricePresets; track price) {
                    <button
                      type="button"
                      class="qs-tab min-w-16"
                      [attr.aria-pressed]="newGamePrice === price"
                      (click)="selectPrice(price)"
                    >
                      {{ price === 0 ? 'None' : price + ' pts' }}
                    </button>
                  }
                  <label class="flex min-h-11 items-center gap-1 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-3 focus-within:border-qs-ink">
                    <input
                      type="number"
                      [(ngModel)]="customPrice"
                      (ngModelChange)="onCustomPriceChange()"
                      placeholder="Custom"
                      aria-label="Custom points per square"
                      min="0"
                      class="w-20 bg-transparent text-base text-qs-ink placeholder:text-qs-muted focus:outline-none"
                    />
                    <span class="qs-label text-qs-muted">pts</span>
                  </label>
                </div>
              </section>

              <!-- 04 Details -->
              <section>
                <h4 class="qs-eyebrow qs-eyebrow-bar">04 / Details</h4>
                <div class="mt-3 space-y-4">
                  <div>
                    <label for="new-game-name" class="qs-label mb-1.5 block text-qs-muted">Game name <span class="text-qs-bad">*</span></label>
                    <input
                      id="new-game-name"
                      type="text"
                      [(ngModel)]="newGameName"
                      placeholder="Super Bowl party"
                      class="qs-input"
                      [class.qs-input-error]="gameNameError()"
                      [attr.aria-invalid]="gameNameError()"
                    />
                    @if (gameNameError()) {
                      <p class="mt-1.5 text-sm text-qs-bad">Give your game a name.</p>
                    }
                  </div>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label for="new-game-host-note" class="qs-label mb-1.5 block text-qs-muted">Note from the host <span class="normal-case tracking-normal">(optional)</span></label>
                      <input id="new-game-host-note" type="text" [(ngModel)]="newGameHostNote" maxlength="140" placeholder="e.g. Snacks at halftime!" class="qs-input" />
                    </div>
                    <div>
                      <label for="new-game-manager" class="qs-label mb-1.5 block text-qs-muted">Co-host <span class="normal-case tracking-normal">(optional)</span></label>
                      <input id="new-game-manager" type="email" [(ngModel)]="newGamePaymentManager" placeholder="their@email.com" class="qs-input" />
                    </div>
                  </div>
                  <p class="text-xs text-qs-muted">A co-host can help confirm players.</p>
                </div>
              </section>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-qs-line bg-qs-panel-2 px-6 py-4">
              <button type="button" (click)="showCreateModal.set(false)" class="qs-btn qs-btn-ghost text-qs-muted">Cancel</button>
              <button type="button" (click)="createGame()" [disabled]="isCreating()" [attr.aria-busy]="isCreating()" class="qs-btn qs-btn-primary min-w-40">
                @if (isCreating()) {
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating
                } @else {
                  Create game
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Share Modal -->
      <app-share-dialog [isOpen]="!!shareModalGameId()" [gameId]="shareModalGameId() || ''" [link]="shareModalGameId() ? getShareLink(shareModalGameId()!) : ''" (closed)="shareModalGameId.set(null)"></app-share-dialog>

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
                    <svg class="animate-spin h-6 w-6 text-qs-accent" viewBox="0 0 24 24">
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
                          ? 'p-3 border-2 border-qs-accent bg-qs-accent-soft rounded-xl text-left transition-all'
                          : 'p-3 border-2 border-default hover:border-hover rounded-xl text-left transition-all'"
                      >
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="font-semibold text-sm"
                              [class]="editEspnGameId === game.id ? 'text-qs-ink' : 'text-heading'">{{ game.awayTeam }} &#64; {{ game.homeTeam }}</p>
                            @if (game.status === 'pre' && game.date) {
                              <p class="text-xs"
                                [class]="editEspnGameId === game.id ? 'text-qs-accent' : 'text-muted'">{{ formatGameDate(game.date) }}</p>
                            }
                            @if (game.status !== 'pre') {
                              <p class="text-xs"
                                [class]="editEspnGameId === game.id ? 'text-qs-accent' : 'text-muted'">{{ game.awayScore }} - {{ game.homeScore }}</p>
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
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-qs-accent focus:ring-2 focus:ring-qs-accent-soft outline-none text-default"
                />
              </div>

              <!-- Points Per Square -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Points per square</label>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="editGamePrice"
                    min="0"
                    class="flex-1 px-4 py-3 bg-input border border-input rounded-xl focus:border-qs-accent focus:ring-2 focus:ring-qs-accent-soft outline-none text-default"
                  />
                  <span class="text-muted">pts</span>
                </div>
              </div>

              <!-- Host Note -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">Note from the host <span class="text-muted font-normal">(optional)</span></label>
                <input
                  type="text"
                  [(ngModel)]="editGameHostNote"
                  maxlength="140"
                  placeholder="e.g. Snacks at halftime!"
                  class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-qs-accent focus:ring-2 focus:ring-qs-accent-soft outline-none text-default"
                />
              </div>

              <!-- Co-host Assignment -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">
                  Co-host
                  <span class="text-muted font-normal">(optional)</span>
                </label>
                <p class="text-xs text-muted mb-2">Assign a player as co-host. A co-host can help confirm players.</p>
                @if (editingGame()?.managerId) {
                  <div class="flex items-center gap-2 p-3 bg-qs-ok-soft border border-qs-ok-soft rounded-xl dark:bg-qs-tile-ok/30 dark:border-qs-ok">
                    <span class="flex-1 text-qs-ok dark:text-qs-ok">{{ editingGame()?.managerName || editingGame()?.managerEmail || 'Assigned' }}</span>
                    <button
                      (click)="removeManager()"
                      class="qs-btn qs-btn-danger"
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
                      class="w-full px-4 py-3 bg-input border border-input rounded-xl focus:border-qs-accent focus:ring-2 focus:ring-qs-accent-soft outline-none text-default"
                      autocomplete="off"
                    />
                    @if (showManagerDropdown() && managerSearchResults().length > 0) {
                      <div class="absolute z-10 mt-1 w-full bg-dialog border border-default rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        @for (player of managerSearchResults(); track player.uid; let i = $index) {
                          <button
                            (mousedown)="assignManagerFromPlayer(player)"
                            (mouseenter)="selectedManagerIndex.set(i)"
                            [class]="i === selectedManagerIndex()
                              ? 'w-full px-4 py-3 text-left text-default bg-qs-accent-soft dark:bg-qs-accent/30 transition-colors'
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
                class="qs-btn qs-btn-ghost text-qs-muted"
              >
                Cancel
              </button>
              <button
                (click)="saveGameEdits()"
                [disabled]="isSavingGame()"
                class="qs-btn qs-btn-primary px-8"
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
    @if (showUpgradeDialog()) {
      <app-upgrade-pass-dialog (dismissed)="closeUpgrade()" />
    }
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
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
    @keyframes menu-in {
      from { opacity: 0; transform: translateY(-4px); }
    }
    .animate-menu-in {
      animation: menu-in 120ms cubic-bezier(.2,.7,.2,1);
    }
    @media (prefers-reduced-motion: reduce) {
      .animate-menu-in { animation: none; }
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

  private dashboardWalkthroughSteps: WalkthroughStep[] = [
    {
      target: 'hero-section',
      title: 'Welcome to QuarterScore!',
      description: 'This is where you can create new games or join existing ones. Let\'s take a quick tour!',
      position: 'bottom'
    },
    {
      target: 'create-game',
      title: 'Create a New Game',
      description: 'Click here to start your own squares game. You can choose a sport, set points per square, and invite friends.',
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
  readonly boardCells: number[] = Array.from({ length: 100 }, (_, i) => i);
  joinedGames = signal<GameListItem[]>([]);
  isLoadingGames = signal(true);
  isCreating = signal(false);
  isCheckingBoardLimit = signal(false);
  showCreateModal = signal(false);
  showUpgradeDialog = signal(false);
  private upgradeReturnFocus: HTMLElement | null = null;
  shareModalGameId = signal<string | null>(null);
  espnGames = signal<EspnGame[]>([]);
  isLoadingEspnGames = signal(false);
  gameNameError = signal(false);

  // Edit modal state
  showEditModal = signal(false);
  editingGame = signal<GameListItem | null>(null);
  editGameName = '';
  editGameHostNote = '';
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

  newGameName = '';
  newGameHostNote = '';
  newGamePaymentManager = '';
  joinGameCode = '';
  selectedSport: SportType = 'nfl';
  selectedEspnGameId = '';
  /** The New game list collapses to the picked game; Change reopens it. */
  gameListOpen = true;
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
        const linked = owned.filter(game => !!game.espnEventId);
        if (linked.length > 0) {
          this.gameService.ensureLiveGameIndexes(linked.map(game => ({
            gameId: game.id,
            espnEventId: game.espnEventId as string,
            espnSport: game.espnSport
          }))).catch(() => {});
        }
      } catch (error) {
        this.toastService.error('Failed to load games');
      } finally {
        this.isLoadingGames.set(false);
      }
    } else {
      this.isLoadingGames.set(false);
    }
  }

  async openCreateModal(event: Event): Promise<void> {
    const trigger = event.currentTarget;
    if (trigger instanceof HTMLElement) {
      this.upgradeReturnFocus = trigger;
    }
    const user = this.currentUser();
    if (!user || user.isGuest || this.isCheckingBoardLimit()) {
      return;
    }
    this.isCheckingBoardLimit.set(true);
    try {
      await this.gameService.assertUnderFreeBoardLimit(user.uid);
      this.gameListOpen = true;
      this.showCreateModal.set(true);
      this.fetchEspnGames();
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.showUpgradeDialog.set(true);
      } else {
        this.toastService.error('Failed to check your boards. Try again.');
      }
    } finally {
      this.isCheckingBoardLimit.set(false);
    }
  }

  closeUpgrade(): void {
    this.showUpgradeDialog.set(false);
    const trigger = this.upgradeReturnFocus;
    setTimeout(() => trigger?.focus());
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
    this.gameListOpen = true;
    this.fetchEspnGames();
  }

  selectEspnGame(gameId: string): void {
    this.selectedEspnGameId = gameId;
    this.gameListOpen = false;
  }

  selectedEspnGame(): EspnGame | undefined {
    return this.espnGames().find(g => g.id === this.selectedEspnGameId);
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
      case 'pre': return 'bg-qs-panel-2 text-qs-muted';
      case 'in': return 'bg-qs-live-fill text-qs-tile';
      case 'post': return 'bg-qs-ok-soft text-qs-ok';
      default: return 'bg-qs-panel-2 text-qs-muted';
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

      const sanitizedHostNote = this.sanitizationService.sanitizeHostNote(this.newGameHostNote);

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
        sanitizedHostNote || undefined
      );
      this.showCreateModal.set(false);
      this.resetCreateForm();
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.showCreateModal.set(false);
        this.resetCreateForm();
        this.showUpgradeDialog.set(true);
      } else {
        this.toastService.error('Failed to create game');
        this.showCreateModal.set(false);
        this.resetCreateForm();
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  resetCreateForm(): void {
    this.newGameName = '';
    this.newGameHostNote = '';
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
    this.editGameHostNote = game.hostNote || '';
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
      this.toastService.error('Failed to assign co-host');
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
      this.toastService.error('Failed to remove co-host');
    }
  }

  async saveGameEdits(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    const sanitizedName = this.sanitizationService.sanitizeGameName(this.editGameName);
    const sanitizedPrice = this.sanitizationService.validatePrice(this.editGamePrice);
    const sanitizedHostNote = this.sanitizationService.sanitizeHostNote(this.editGameHostNote);

    this.isSavingGame.set(true);
    try {
      const selectedEspnGame = this.editEspnGames().find(g => g.id === this.editEspnGameId);
      const espnChanged = (this.editEspnGameId || undefined) !== game.espnEventId;
      const updates: Record<string, any> = {
        name: sanitizedName,
        pricePerSquare: sanitizedPrice,
        hostNote: sanitizedHostNote,
        espnEventId: this.editEspnGameId || null,
        espnSport: this.editEspnGameId ? this.editSport : null,
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
          hostNote: sanitizedHostNote,
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showCreateModal()) {
      this.showCreateModal.set(false);
    }
  }


}
