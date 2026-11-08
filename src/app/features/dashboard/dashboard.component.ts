import { Component, OnInit, signal, computed, inject, effect, HostListener, ChangeDetectionStrategy } from '@angular/core';

import { miniGridCells, miniGridClass } from '../../core/utils/mini-grid';
import { ToggleComponent } from '../../components/ui/toggle/toggle.component';
import { DropdownComponent } from '../../components/ui/dropdown/dropdown.component';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem, BoardSize } from '../../core/services/game.service';
import { DEFAULT_SPLIT, DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, isNoExpiry } from '../../core/plans';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
import { getTeamLogoByAbbreviation, getTeamColors } from '../content/teams-data';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { CreateGameFormComponent, CreateGameSubmit } from '../create/create-game-form.component';
import { EmptyQuarterRuleComponent } from '../../components/ui/empty-quarter-rule/empty-quarter-rule.component';
import { HelpMenuComponent } from '../../components/ui/help-menu/help-menu.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { HeadroomDirective } from '../../shared/directives/headroom.directive';
import { UpgradePassDialogComponent } from './components/upgrade-pass-dialog/upgrade-pass-dialog.component';
import { PlanService } from '../../core/services/plan.service';
import { ActiveBoardLimitError } from '../../core/errors/active-board-limit.error';
import { buildCreateGameValues, clearCreateDraft, isPendingAutoSubmit, loadCreateDraft, saveCreateDraft } from '../../core/utils/create-game-draft';
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
  heroChevronDown
} from '@ng-icons/heroicons/outline';

type GameSort = 'newest' | 'oldest' | 'name' | 'players' | 'filled' | 'size';
type GameStatusFilter = 'all' | 'open' | 'locked';

@Component({
    selector: 'app-dashboard',
    imports: [FormsModule, NgTemplateOutlet, DropdownComponent, ToggleComponent, CreateGameFormComponent, NgIconComponent, AppHeaderComponent, HeadroomDirective, HelpMenuComponent, ProfileMenuComponent, ShareDialogComponent, EmptyQuarterRuleComponent, UpgradePassDialogComponent],
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
            heroChevronDown
        })
    ],
    template: `
    <div class="min-h-screen bg-page" [attr.inert]="showUpgradeDialog() ? '' : null">
      <!-- Header -->
      <app-shared-header variant="solid" appHeadroom>
        <app-help-menu (tour)="startWalkthrough()"></app-help-menu>

        <app-profile-menu walkthroughTarget="profile-dropdown"></app-profile-menu>
      </app-shared-header>

      <main class="mx-auto max-w-[1600px] px-4 sm:px-8 pt-6 pb-20 md:pt-8">
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
          <!-- Plan card: the upgrade entry point, so only free hosts see it. Season and Admin see their plan in the profile menu. -->
          @if (planService.plan() !== 'season' && planService.plan() !== 'admin') {
            <div class="qs-card mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Your plan">
              <div class="min-w-0">
                <p class="qs-label text-qs-muted">Your plan</p>
                <p class="qs-title mt-1 text-2xl">
                  {{ planService.features().label }}
                  @if (planService.daysLeft()) {
                    <span class="qs-label align-middle text-qs-muted">· {{ planService.daysLeft() }} days left</span>
                  }
                </p>
              </div>
              <button type="button" (click)="openUpgrade($event)" class="qs-btn qs-btn-secondary shrink-0">
                See Season Pass
              </button>
            </div>
          }

          <!-- Admin Panel: Gifted Season Passes (paulqlove@gmail.com only) -->
          @if (isAdmin() && currentUser()?.email?.toLowerCase() === 'paulqlove@gmail.com') {
            <section class="mt-8" aria-labelledby="admin-heading">
              <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
                <button
                  type="button"
                  (click)="toggleAdminPanel()"
                  class="qs-eyebrow qs-eyebrow-bar flex items-center gap-2 hover:text-qs-ink transition-colors"
                  id="admin-heading"
                >
                  <ng-icon
                    [name]="showAdminPanel() ? 'heroChevronDown' : 'heroArrowRight'"
                    class="text-sm"
                  ></ng-icon>
                  Admin / Season Passes
                </button>
                @if (!isLoadingGiftedPasses()) {
                  <span class="qs-label text-qs-muted">{{ giftedPasses().length }} gifted</span>
                }
              </div>

              @if (showAdminPanel()) {
                <div class="mt-5 space-y-4">
                  <!-- Grant new pass - inline form -->
                  <div class="flex items-center gap-2 rounded-card border border-qs-line bg-qs-panel p-1">
                    <input
                      type="email"
                      [(ngModel)]="newGiftEmail"
                      placeholder="Email address"
                      class="min-w-0 flex-1 bg-transparent px-3 py-2 text-qs-ink placeholder:text-qs-muted/60 focus:outline-none"
                      (keyup.enter)="grantSeasonPass()"
                    />
                    <div class="flex items-center gap-1 border-l border-qs-line pl-2">
                      <input
                        type="number"
                        [(ngModel)]="newGiftDays"
                        min="1"
                        max="365"
                        class="w-16 bg-transparent px-2 py-2 text-center text-qs-ink focus:outline-none"
                      />
                      <span class="text-sm text-qs-muted pr-1">days</span>
                    </div>
                    <button
                      type="button"
                      (click)="grantSeasonPass()"
                      [disabled]="isGrantingPass() || !newGiftEmail.trim()"
                      class="qs-btn qs-btn-primary shrink-0"
                    >
                      {{ isGrantingPass() ? 'Adding...' : 'Add' }}
                    </button>
                  </div>

                  <!-- List of gifted passes -->
                  @if (isLoadingGiftedPasses()) {
                    <div class="qs-card animate-pulse bg-qs-panel-2 h-20"></div>
                  } @else if (giftedPasses().length === 0) {
                    <p class="text-center text-qs-muted py-6">No gifted passes yet</p>
                  } @else {
                    <div class="overflow-hidden rounded-card border border-qs-line">
                      <table class="w-full text-left">
                        <thead class="bg-qs-panel-2 text-xs uppercase tracking-wider text-qs-muted">
                          <tr>
                            <th class="px-4 py-2 font-medium">Email</th>
                            <th class="px-4 py-2 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-qs-line bg-qs-panel">
                          @for (pass of giftedPasses(); track pass.email) {
                            <tr class="group">
                              <td class="min-w-0 break-all px-4 py-3 text-qs-ink">{{ pass.email }}</td>
                              <td class="px-4 py-3">
                                <div class="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  (click)="revokePass(pass.email)"
                                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-qs-muted transition-colors hover:text-qs-warn focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  [attr.aria-label]="'Revoke the pass for ' + pass.email"
                                  title="Revoke pass"
                                >
                                  <ng-icon name="heroXMark" class="text-base"></ng-icon>
                                </button>
                                <button
                                  type="button"
                                  class="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-[filter] hover:brightness-110 disabled:cursor-default disabled:hover:brightness-100"
                                  [class]="isPassExpired(pass.expiresAt)
                                    ? 'bg-qs-warn-soft text-qs-warn'
                                    : 'bg-qs-ok-soft text-qs-ok'"
                                  [disabled]="hasNoExpiry(pass.expiresAt) || updatingPassEmail() === pass.email"
                                  [attr.title]="hasNoExpiry(pass.expiresAt) ? 'This pass never expires' : 'Click to make this pass never expire'"
                                  [attr.aria-label]="hasNoExpiry(pass.expiresAt) ? pass.email + ': never expires' : 'Make the pass for ' + pass.email + ' never expire'"
                                  (click)="makePassPermanent(pass.email)"
                                >
                                  {{ formatExpiry(pass.expiresAt) }}
                                </button>
                                </div>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <section class="mt-8" data-walkthrough="my-games" aria-labelledby="hosting-heading">
            <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
              <h3 id="hosting-heading" class="qs-eyebrow qs-eyebrow-bar">01 / Hosting</h3>
              @if (!isLoadingGames()) {
                <span class="qs-label text-qs-muted">{{ visibleMyGames().length === myGames().length ? myGames().length : visibleMyGames().length + ' of ' + myGames().length }} {{ myGames().length === 1 ? 'game' : 'games' }}</span>
              }
            </div>

            @if (!isLoadingGames() && myGames().length >= 5) {
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <input type="search" [value]="gameSearch()" (input)="gameSearch.set($any($event.target).value)" placeholder="Search by name or team" aria-label="Search your boards" class="qs-input min-h-9 min-w-0 flex-1 basis-full py-0 sm:basis-48" />
                <div class="flex gap-1.5" role="group" aria-label="Filter by status">
                  @for (f of statusFilters; track f.value) {
                    <button type="button" class="qs-tab min-h-9 px-3" [attr.aria-pressed]="gameStatus() === f.value" (click)="gameStatus.set(f.value)">{{ f.label }}</button>
                  }
                </div>
                <app-dropdown class="ml-auto" [options]="sortOptions" [value]="gameSort()" (valueChange)="gameSort.set($any($event))" prefix="Sort: " ariaLabel="Sort boards"></app-dropdown>
              </div>
            }

            @if (isLoadingGames()) {
              <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                @for (i of [0, 1, 2]; track i) {
                  <div class="qs-card h-64 animate-pulse bg-qs-panel-2"></div>
                }
              </div>
            } @else if (myGames().length === 0) {
              <div class="qs-card mt-5 p-10 text-center">
                <p class="qs-title text-2xl">No boards yet</p>
                <p class="mt-2 text-qs-muted">Create a board, share the code, and let everyone pick their squares.</p>
                <button
                  type="button"
                  (click)="openCreateModal($event)"
                  [disabled]="isCheckingBoardLimit()"
                  [attr.aria-busy]="isCheckingBoardLimit()"
                  class="qs-btn qs-btn-primary mt-6 disabled:cursor-wait"
                >
                  <ng-icon name="heroPlus" class="text-base"></ng-icon>
                  Create your first board
                </button>
              </div>
            } @else {
              @if (visibleMyGames().length === 0) {
                <div class="qs-card mt-5 p-8 text-center">
                  <p class="text-qs-muted">No boards match.</p>
                  <button type="button" class="qs-btn qs-btn-secondary mt-4" (click)="clearGameFilters()">Clear search and filters</button>
                </div>
              } @else {
                <div class="mt-5 grid grid-cols-1 gap-x-4 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
                  @for (game of visibleMyGames(); track game.id) {
                    <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: false }"></ng-container>
                  }
                </div>
              }
            }
          </section>
        }

        <!-- Joined -->
        @if (joinedGames().length > 0) {
          <section class="mt-8" aria-labelledby="joined-heading">
            <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
              <h3 id="joined-heading" class="qs-eyebrow qs-eyebrow-bar">{{ canCreateGame() ? '02' : '01' }} / Joined</h3>
              <span class="qs-label text-qs-muted">{{ joinedGames().length }} {{ joinedGames().length === 1 ? 'game' : 'games' }}</span>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-x-4 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
              @for (game of joinedGames(); track game.id) {
                <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: true }"></ng-container>
              }
            </div>
          </section>
        }
      </main>

      <ng-template #gameCard let-game let-joined="joined">
        <article class="qs-card row-span-4 mb-4 grid p-5 transition-colors [grid-template-rows:subgrid] [row-gap:0] hover:border-qs-line-strong">
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

          <div class="mt-4 min-w-0">
            <h4 class="truncate text-xl font-semibold tracking-tight text-qs-ink">{{ game.name }}</h4>
            <p class="mt-1 truncate text-sm text-qs-muted">
              @if (game.homeTeam && game.awayTeam) {
                {{ game.awayTeam }} vs {{ game.homeTeam }}
              } @else {
                Teams not set
              }
              · Created {{ formatDate(game.createdAt) }}
            </p>
          </div>

          <div class="mt-5 flex items-center gap-5">
            <div [class]="'grid w-[68px] shrink-0 gap-px rounded-[3px] bg-qs-line p-px ' + getMiniGridClass(game.boardSize)" aria-hidden="true">
              @for (i of getBoardCells(game.boardSize); track i) {
                <span class="aspect-square" [class]="i < game.squaresFilled ? 'bg-qs-accent' : 'bg-qs-panel'"></span>
              }
            </div>
            <dl class="grid flex-1 grid-cols-3 gap-3">
              <div>
                <dt class="qs-label text-[10px] text-qs-muted">Squares</dt>
                <dd class="mt-1 text-lg font-semibold tabular-nums text-qs-ink">{{ game.squaresFilled }}<span class="text-sm font-normal text-qs-muted">/{{ game.boardSize }}</span></dd>
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
            @if (joined) {
              <button type="button" (click)="removeJoinedGame(game.id)" class="qs-btn qs-btn-ghost w-11 px-0 text-qs-muted hover:text-qs-ink" title="Remove from my list" aria-label="Remove from my list">
                <ng-icon name="heroXMark" class="text-lg"></ng-icon>
              </button>
            }
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
          animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          (click)="closeCreateModal()"
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
                (click)="closeCreateModal()"
                class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink"
                aria-label="Close"
              >
                <ng-icon name="heroXMark" class="text-xl"></ng-icon>
              </button>
            </div>

            <app-create-game-form
              [customSplitsAllowed]="planService.features().customSplits"
              [openBoardsAllowed]="planService.features().activeBoards > 1"
              [isCreating]="isCreating()"
              (cancelled)="closeCreateModal()"
              (submitted)="createGame($event)"
            ></app-create-game-form>
          </div>
        </div>
      }

      <!-- Share Modal -->
      <app-share-dialog [isOpen]="!!shareModalGameId()" [gameId]="shareModalGameId() || ''" (closed)="shareModalGameId.set(null)"></app-share-dialog>

      <!-- Edit Game Modal -->
      @if (showEditModal()) {
        <div animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="closeEditModal()">
          <div class="bg-dialog rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain animate-modal-in" (click)="$event.stopPropagation()">
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

              <!-- Custom Team Names or ESPN Game Selection -->
              @if (editSport === 'custom') {
                <div>
                  <label class="block text-sm font-semibold text-label mb-2">Teams</label>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label for="edit-custom-away" class="qs-label mb-1.5 block text-qs-muted">Away team</label>
                      <input id="edit-custom-away" type="text" [(ngModel)]="editCustomAwayTeam" maxlength="50" placeholder="e.g. Lincoln High" class="qs-input" />
                    </div>
                    <div>
                      <label for="edit-custom-home" class="qs-label mb-1.5 block text-qs-muted">Home team</label>
                      <input id="edit-custom-home" type="text" [(ngModel)]="editCustomHomeTeam" maxlength="50" placeholder="e.g. Washington High" class="qs-input" />
                    </div>
                  </div>
                  <p class="mt-2 text-xs text-qs-muted">Enter scores manually from the game page.</p>
                </div>
              } @else {
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
                    @if (editEspnGames().length > 10) {
                      <div class="mb-2">
                        <input
                          type="text"
                          [(ngModel)]="editEspnGameSearch"
                          placeholder="Search teams..."
                          class="qs-input w-full"
                        />
                      </div>
                    }
                    <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      @for (game of filteredEditEspnGames(); track game.id) {
                        <button
                          (click)="selectEditEspnGame(game.id)"
                          [class]="editEspnGameId === game.id
                            ? 'p-3 border-2 border-qs-accent bg-qs-accent-soft rounded-xl text-left transition-all'
                            : 'p-3 border-2 border-default hover:border-hover rounded-xl text-left transition-all'"
                        >
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="flex items-center gap-1.5 font-semibold text-sm"
                                [class]="editEspnGameId === game.id ? 'text-qs-ink' : 'text-heading'">
                                @if (editSport === 'nfl' && getTeamLogo(game.awayTeam); as logo) {
                                  <img [src]="logo" [alt]="game.awayTeam" class="h-4 w-4 object-contain" />
                                }
                                {{ game.awayTeam }} &#64;
                                @if (editSport === 'nfl' && getTeamLogo(game.homeTeam); as logo) {
                                  <img [src]="logo" [alt]="game.homeTeam" class="h-4 w-4 object-contain" />
                                }
                                {{ game.homeTeam }}
                              </p>
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
              }

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

              <!-- Show in my open boards: only for hosts who can run several boards -->
              @if (editingGame(); as og) {
                @if (planService.features().activeBoards > 1 && (og.showInOpenBoards || (!og.isLocked && !editBoardRandomized() && og.squaresFilled < og.boardSize))) {
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <label class="block text-sm font-semibold text-label mb-1">Show in my open boards</label>
                      <p class="text-xs text-muted">Anyone who opens one of your boards can see this board's name, points per square and how many squares are left, and can join it. Off by default. Anyone with the link can still open it.</p>
                      <p class="mt-2 truncate rounded-xl border border-input bg-input px-3 py-2 font-mono text-xs text-default">{{ editGameName }} · Points per square: {{ editGamePrice }} · {{ og.squaresFilled }}/{{ og.boardSize }} taken</p>
                    </div>
                    <app-toggle [checked]="editShowInOpenBoards" (onChange)="editShowInOpenBoards = $event"></app-toggle>
                  </div>
                }
              }

              <!-- Board size: only smaller, only while the picks fit and the numbers are not drawn -->
              @if (editingGame(); as eg) {
                @if (eg.boardSize > 25) {
                  <div>
                    <label class="block text-sm font-semibold text-label mb-2">Board size</label>
                    <div class="flex flex-wrap gap-2">
                      <button type="button" (click)="editNewSize.set(null)"
                        [class]="!editNewSize() ? 'px-4 py-2 bg-header text-header rounded-lg font-medium text-sm' : 'px-4 py-2 bg-control text-default hover:bg-control-hover rounded-lg font-medium text-sm'">
                        Keep {{ eg.boardSize }}
                      </button>
                      @for (s of editSmallerSizes; track s) {
                        @if (s < eg.boardSize) {
                          <button type="button" [disabled]="!editSizeChoices().includes(s)" (click)="editNewSize.set(s)"
                            [class]="(editNewSize() === s ? 'px-4 py-2 bg-header text-header' : 'px-4 py-2 bg-control text-default hover:bg-control-hover') + ' rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed'">
                            {{ s }} squares
                          </button>
                        }
                      }
                    </div>
                    @if (editNewSize()) {
                      <p class="text-xs text-muted mt-2">Squares will be shuffled into the smaller board. Players keep the same number of squares, in new spots.</p>
                    } @else if (editBoardRandomized()) {
                      <p class="text-xs text-muted mt-2">The size can't change after the numbers are drawn.</p>
                    } @else {
                      <p class="text-xs text-muted mt-2">{{ eg.squaresFilled }} picked. A smaller board needs that many or fewer squares picked.</p>
                    }
                  </div>
                }
              }

              <!-- Empty quarter rule -->
              <app-empty-quarter-rule name="dash-edit-empty-quarter-rule" [(value)]="editEmptyRule"></app-empty-quarter-rule>

              <!-- Co-host Assignment -->
              <div>
                <label class="block text-sm font-semibold text-label mb-2">
                  Co-host
                  <span class="text-muted font-normal">(optional)</span>
                </label>
                <p class="text-xs text-muted mb-2">Assign a player as co-host. A co-host can help manage players.</p>
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
      <app-upgrade-pass-dialog [trigger]="upgradeTrigger()" [boardName]="endedBoard()?.name ?? ''" (dismissed)="closeUpgrade()" (resetOld)="resetOldBoard()" (deleteOld)="deleteOldBoard()" />
    }
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private espnService = inject(EspnService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private walkthroughService = inject(WalkthroughService);
  private sanitizationService = inject(SanitizationService);

  constructor() {
    // Lock body scroll when any modal is open
    effect(() => {
      const anyModalOpen = this.showCreateModal() || this.showEditModal() || this.showUpgradeDialog();
      if (typeof document !== 'undefined') {
        document.body.style.overflow = anyModalOpen ? 'hidden' : '';
      }
    });
  }

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
  protected planService = inject(PlanService);
  protected readonly Infinity = Infinity;

  myGames = signal<GameListItem[]>([]);
  gameSearch = signal('');
  gameSort = signal<GameSort>('newest');
  gameStatus = signal<GameStatusFilter>('all');
  readonly sortOptions: { value: GameSort; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'name', label: 'Name A–Z' },
    { value: 'players', label: 'Most players' },
    { value: 'filled', label: 'Most full' },
    { value: 'size', label: 'Board size' }
  ];
  readonly statusFilters: { value: GameStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'locked', label: 'Locked' }
  ];
  /** Hosted boards after the search, status filter and sort. */
  visibleMyGames = computed(() => {
    const query = this.gameSearch().trim().toLowerCase();
    const status = this.gameStatus();
    const fill = (g: GameListItem): number => g.squaresFilled / (g.boardSize || 100);
    const sorts: Record<GameSort, (a: GameListItem, b: GameListItem) => number> = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      name: (a, b) => a.name.localeCompare(b.name),
      players: (a, b) => b.playerCount - a.playerCount,
      filled: (a, b) => fill(b) - fill(a),
      size: (a, b) => (b.boardSize || 100) - (a.boardSize || 100)
    };
    return this.myGames()
      .filter(g => status === 'all' || (status === 'locked') === g.isLocked)
      .filter(g => !query || [g.name, g.homeTeam, g.awayTeam, g.id].some(v => (v || '').toLowerCase().includes(query)))
      .sort(sorts[this.gameSort()]);
  });
  joinedGames = signal<GameListItem[]>([]);

  /** Get cells array for mini board preview based on board size */
  getBoardCells(size: BoardSize): number[] {
    return miniGridCells(size);
  }

  /** Get CSS class for mini board grid based on board size */
  getMiniGridClass(size: BoardSize): string {
    return miniGridClass(size);
  }
  isLoadingGames = signal(true);
  isCreating = signal(false);
  isCheckingBoardLimit = signal(false);
  showCreateModal = signal(false);
  showUpgradeDialog = signal(false);
  upgradeTrigger = signal<'limit' | 'pass' | 'ended'>('limit');
  /** The finished board shown in the 'ended' dialog. */
  endedBoard = signal<GameListItem | null>(null);
  private upgradeReturnFocus: HTMLElement | null = null;
  shareModalGameId = signal<string | null>(null);

  // Edit modal state
  showEditModal = signal(false);
  editingGame = signal<GameListItem | null>(null);
  editGameName = '';
  editGameHostNote = '';
  editGamePrice = 10;
  editSport: SportType | 'custom' = 'nfl';
  editEspnGameId = '';
  editEmptyRule: EmptyQuarterRule = DEFAULT_EMPTY_QUARTER_RULE;
  editEspnGameSearch = '';
  editCustomHomeTeam = '';
  editCustomAwayTeam = '';
  editEspnGames = signal<EspnGame[]>([]);
  isLoadingEditEspnGames = signal(false);
  editGamePlayers = signal<{ name: string; uid: string }[]>([]);
  editBoardRandomized = signal(false);
  editNewSize = signal<BoardSize | null>(null);
  editShowInOpenBoards = false;
  editSmallerSizes: BoardSize[] = [50, 25];
  managerSearchQuery = '';
  managerSearchResults = signal<{ name: string; uid: string }[]>([]);
  selectedManagerIndex = signal(-1);
  showManagerDropdown = signal(false);
  isSavingGame = signal(false);

  // Profile dropdown state

  joinGameCode = '';
  sportOptions: { value: SportType | 'custom'; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'ncaaf', label: 'NCAA Football' },
    { value: 'ufl', label: 'UFL' },
    { value: 'nba', label: 'NBA' },
    { value: 'wnba', label: 'WNBA' },
    { value: 'afl', label: 'AFL' },
    { value: 'custom', label: 'Custom' }
  ];

  ngOnInit(): void {
    this.loadMyGames();
    // Preload gifted passes count for admins
    if (this.isAdmin() && this.currentUser()?.email?.toLowerCase() === 'paulqlove@gmail.com') {
      this.loadGiftedPasses();
    }
    // Check for create intent (query param or sessionStorage from team page)
    const createFromQuery = this.route.snapshot.queryParamMap.get('create') === 'true';
    const createFromStorage = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qs_create_after_auth') === 'true';
    const createFromDraft = typeof localStorage !== 'undefined' && isPendingAutoSubmit(loadCreateDraft());
    if (createFromQuery || createFromStorage || createFromDraft) {
      // Clear both indicators
      if (createFromQuery) {
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
      if (createFromStorage) {
        sessionStorage.removeItem('qs_create_after_auth');
      }
      setTimeout(() => this.openCreateModalDirect(), 100);
    }
  }

  /** Open create modal directly without event (for query param trigger). Finishes a create the visitor started signed out. */
  private async openCreateModalDirect(): Promise<void> {
    await this.authService.waitForAuthReady();
    const user = this.currentUser();
    const draft = loadCreateDraft();
    if (!user) return;
    this.isCheckingBoardLimit.set(true);
    try {
      if (isPendingAutoSubmit(draft)) {
        // The limit checks below need the real plan and board list, not the defaults.
        await Promise.all([this.loadMyGames(), this.planService.refresh(user.uid)]);
        saveCreateDraft({ ...draft, autoSubmit: false });
      }
      await this.gameService.assertUnderFreeBoardLimit(user.uid);
      if (this.showEndedBoardDialog()) return;
      const built = isPendingAutoSubmit(draft) ? buildCreateGameValues(draft, this.sanitizationService, this.planService.features().customSplits) : null;
      if (draft && built?.ok) {
        await this.createGame({ draft, values: built.values });
        return;
      }
      this.showCreateModal.set(true);
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.upgradeTrigger.set('limit');
        this.showUpgradeDialog.set(true);
      } else {
        // Never fail silently: say so, and open the form with the saved entries.
        console.error('[Dashboard] Could not finish the create', (error as { code?: string })?.code ?? error);
        this.toastService.error('We could not finish creating your board. Your entries are saved: press Create to try again.');
        this.showCreateModal.set(true);
      }
    } finally {
      this.isCheckingBoardLimit.set(false);
    }
  }

  startWalkthrough(): void {
    this.walkthroughService.resetCompletion('dashboard');
    this.walkthroughService.start('dashboard', this.dashboardWalkthroughSteps);
  }

  clearGameFilters(): void {
    this.gameSearch.set('');
    this.gameStatus.set('all');
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
      if (this.showEndedBoardDialog()) return;
      this.showCreateModal.set(true);
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.upgradeTrigger.set('limit');
        this.showUpgradeDialog.set(true);
      } else {
        this.toastService.error('Failed to check your boards. Try again.');
      }
    } finally {
      this.isCheckingBoardLimit.set(false);
    }
  }

  /**
   * A free host whose only board has ended: ask them to reset or delete it before starting another.
   * Returns true when the dialog was opened. Paid plans with room, and admins, are not affected.
   */
  private showEndedBoardDialog(): boolean {
    const owned = this.myGames();
    if (owned.length === 0 || owned.length < this.planService.features().activeBoards) return false;
    this.endedBoard.set(owned[0]);
    this.upgradeTrigger.set('ended');
    this.showUpgradeDialog.set(true);
    return true;
  }

  /** Clears the finished board, then opens its settings so the host can pick the next game. */
  async resetOldBoard(): Promise<void> {
    const board = this.endedBoard();
    if (!board) return;
    if (!confirm('Reset this game? Squares, numbers and scores are cleared. Players keep your link.')) return;
    try {
      await this.gameService.resetGame(board.id, board.boardSize);
      this.myGames.update(games => games.map(g => g.id === board.id ? { ...g, squaresFilled: 0, playerCount: 0, confirmedCount: 0, isLocked: false } : g));
      this.showUpgradeDialog.set(false);
      this.openEditModal(board);
    } catch {
      this.toastService.error('Could not reset the game. Try again.');
    }
  }

  /** Deletes the finished board, then opens the new game form. */
  async deleteOldBoard(): Promise<void> {
    const board = this.endedBoard();
    const user = this.currentUser();
    if (!board || !user) return;
    if (!confirm('Delete this game? This cannot be undone.')) return;
    try {
      await this.gameService.deleteGame(board.id, user.uid);
      this.myGames.update(games => games.filter(g => g.id !== board.id));
      this.showUpgradeDialog.set(false);
      this.showCreateModal.set(true);
    } catch {
      this.toastService.error('Could not delete the game. Try again.');
    }
  }

  openUpgrade(event: Event): void {
    if (event.currentTarget instanceof HTMLElement) this.upgradeReturnFocus = event.currentTarget;
    this.upgradeTrigger.set('pass');
    this.showUpgradeDialog.set(true);
  }

  closeUpgrade(): void {
    this.showUpgradeDialog.set(false);
    const trigger = this.upgradeReturnFocus;
    setTimeout(() => trigger?.focus());
  }

  filteredEditEspnGames(): EspnGame[] {
    const query = this.editEspnGameSearch.toLowerCase().trim();
    if (!query) return this.editEspnGames();
    return this.editEspnGames().filter(g =>
      g.homeTeam.toLowerCase().includes(query) ||
      g.awayTeam.toLowerCase().includes(query) ||
      g.homeTeamFull.toLowerCase().includes(query) ||
      g.awayTeamFull.toLowerCase().includes(query)
    );
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

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    clearCreateDraft();
  }

  async createGame(submit: CreateGameSubmit): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    if (user.isGuest) {
      this.toastService.error('Sign in with Google or email to create a game.');
      return;
    }

    const { draft, values } = submit;
    this.isCreating.set(true);
    try {
      const gameId = await this.gameService.createGame(
        user.uid,
        user.displayName || 'Unknown',
        values.name,
        values.espnEventId,
        values.homeTeam,
        values.awayTeam,
        values.price,
        values.espnSport,
        values.manager,
        values.hostNote,
        values.boardSize,
        values.quarterSplit,
        values.emptyQuarterRule
      );
      if (values.showInOpenBoards) {
        try {
          await this.gameService.setShowInOpenBoards(gameId, user.uid, true);
        } catch {
          this.toastService.warning('Board created, but Show in my open boards could not be turned on. Try again in Edit.');
        }
      }
      this.showCreateModal.set(false);
      clearCreateDraft();
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      // Keep what the host entered so a retry, or a reset of the old board, does not start over.
      saveCreateDraft({ ...draft, autoSubmit: false });
      if (error instanceof ActiveBoardLimitError) {
        this.showCreateModal.set(false);
        this.upgradeTrigger.set('limit');
        this.showUpgradeDialog.set(true);
      } else {
        console.error('[Dashboard] Create game failed', (error as { code?: string })?.code ?? error);
        this.toastService.error('Failed to create game');
        this.showCreateModal.set(true);
      }
    } finally {
      this.isCreating.set(false);
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

  /** Takes a joined game off this user's list only. Their squares stay on the board. */
  async removeJoinedGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      await this.gameService.removeJoinedGame(user.uid, gameId);
      this.joinedGames.update(games => games.filter(g => g.id !== gameId));
      this.toastService.success('Removed from your list. Your squares stay on the board.');
    } catch {
      this.toastService.error('Could not remove it. Try again.');
    }
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

  getTeamLogo(abbrev: string): string | null {
    return getTeamLogoByAbbreviation(abbrev, 100);
  }

  getGameGradient(game: EspnGame): string {
    const awayColors = getTeamColors(game.awayTeam);
    const homeColors = getTeamColors(game.homeTeam);
    if (awayColors && homeColors) {
      return `linear-gradient(135deg, ${awayColors.primary}15 0%, transparent 50%, ${homeColors.primary}15 100%)`;
    }
    return '';
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
    // Detect custom games: no ESPN event means custom
    const isCustomGame = !game.espnEventId;
    this.editSport = isCustomGame ? 'custom' : (game.espnSport || 'nfl');
    this.editEspnGameId = game.espnEventId || '';
    this.editEmptyRule = game.emptyQuarterRule ?? DEFAULT_EMPTY_QUARTER_RULE;
    this.editCustomHomeTeam = game.homeTeam || '';
    this.editCustomAwayTeam = game.awayTeam || '';
    this.editNewSize.set(null);
    this.editBoardRandomized.set(false);
    this.editShowInOpenBoards = !!game.showInOpenBoards;
    this.managerSearchQuery = '';
    this.managerSearchResults.set([]);
    this.selectedManagerIndex.set(-1);
    this.showManagerDropdown.set(false);
    this.showEditModal.set(true);
    if (!isCustomGame) {
      this.fetchEditEspnGames();
    }

    const fullGame = await this.gameService.getGame(game.id);
    this.editBoardRandomized.set(!!fullGame?.isRandomized);
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

  editSizeChoices(): BoardSize[] {
    const g = this.editingGame();
    return g ? this.gameService.smallerSizesFor(g.boardSize, g.squaresFilled, this.editBoardRandomized()) : [];
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGame.set(null);
    this.managerSearchQuery = '';
    this.managerSearchResults.set([]);
    this.editGamePlayers.set([]);
    this.showManagerDropdown.set(false);
    this.editEspnGames.set([]);
    this.editEspnGameSearch = '';
  }

  async fetchEditEspnGames(): Promise<void> {
    if (this.editSport === 'custom') {
      this.editEspnGames.set([]);
      return;
    }
    this.isLoadingEditEspnGames.set(true);
    try {
      const games = await this.espnService.getGames(this.editSport);
      this.editEspnGames.set(games);
    } finally {
      this.isLoadingEditEspnGames.set(false);
    }
  }

  selectEditSport(sport: SportType | 'custom'): void {
    this.editSport = sport;
    this.editEspnGameId = '';
    this.editEspnGameSearch = '';
    if (sport === 'custom') {
      this.editEspnGames.set([]);
    } else {
      this.fetchEditEspnGames();
    }
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

      // Determine team names: custom game uses edited fields, ESPN game uses selected game
      let homeTeam: string;
      let awayTeam: string;
      if (this.editSport === 'custom') {
        homeTeam = this.sanitizationService.sanitizeTeamName(this.editCustomHomeTeam) || game.homeTeam || '';
        awayTeam = this.sanitizationService.sanitizeTeamName(this.editCustomAwayTeam) || game.awayTeam || '';
      } else {
        homeTeam = selectedEspnGame?.homeTeam || game.homeTeam || '';
        awayTeam = selectedEspnGame?.awayTeam || game.awayTeam || '';
      }

      const updates: Record<string, any> = {
        name: sanitizedName,
        pricePerSquare: sanitizedPrice,
        hostNote: sanitizedHostNote,
        emptyQuarterRule: this.editEmptyRule,
        espnEventId: this.editEspnGameId || null,
        espnSport: this.editEspnGameId && this.editSport !== 'custom' ? this.editSport : null,
        homeTeam,
        awayTeam
      };
      if (espnChanged) {
        updates['scores'] = { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } };
        updates['winners'] = {};
      }
      const newSize = this.editNewSize();
      if (newSize) await this.gameService.resizeBoard(game.id, newSize);
      await this.gameService.updateGame(game.id, updates);
      // The open-boards switch saves on its own so a failure here never loses the other edits.
      let showApplied = !!game.showInOpenBoards;
      const uid = this.currentUser()?.uid;
      if (uid && this.editShowInOpenBoards !== showApplied) {
        try {
          await this.gameService.setShowInOpenBoards(game.id, uid, this.editShowInOpenBoards);
          showApplied = this.editShowInOpenBoards;
        } catch {
          this.toastService.warning('Saved, but Show in my open boards could not be changed. Try again in a moment.');
        }
      }
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? {
          ...g,
          ...(newSize ? { boardSize: newSize } : {}),
          showInOpenBoards: showApplied,
          name: sanitizedName,
          pricePerSquare: sanitizedPrice,
          hostNote: sanitizedHostNote,
          emptyQuarterRule: this.editEmptyRule,
          espnEventId: this.editEspnGameId || undefined,
          espnSport: this.editEspnGameId && this.editSport !== 'custom' ? this.editSport : undefined,
          homeTeam,
          awayTeam,
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
      this.closeCreateModal();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin: Gifted Season Pass Management
  // ─────────────────────────────────────────────────────────────────────────────

  isAdmin = this.authService.isPreviewAdmin;
  showAdminPanel = signal(false);
  giftedPasses = signal<{ email: string; expiresAt: number; updatedAt?: number }[]>([]);
  newGiftEmail = '';
  newGiftDays = 210;
  isLoadingGiftedPasses = signal(false);
  updatingPassEmail = signal<string | null>(null);
  isGrantingPass = signal(false);

  toggleAdminPanel(): void {
    const isOpen = !this.showAdminPanel();
    this.showAdminPanel.set(isOpen);
    if (isOpen) {
      this.loadGiftedPasses();
    }
  }

  async loadGiftedPasses(): Promise<void> {
    this.isLoadingGiftedPasses.set(true);
    try {
      const passes = await this.gameService.listGiftedSeasonPasses();
      this.giftedPasses.set(passes);
    } catch {
      this.toastService.error('Failed to load gifted passes');
    } finally {
      this.isLoadingGiftedPasses.set(false);
    }
  }

  async grantSeasonPass(): Promise<void> {
    const email = this.newGiftEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toastService.error('Please enter a valid email');
      return;
    }
    this.isGrantingPass.set(true);
    try {
      await this.gameService.grantSeasonPass(email, this.newGiftDays);
      this.newGiftEmail = '';
      this.toastService.success(`Season pass granted to ${email}`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Failed to grant season pass');
    } finally {
      this.isGrantingPass.set(false);
    }
  }

  async revokePass(email: string): Promise<void> {
    if (!confirm(`Revoke season pass for ${email}?`)) return;
    try {
      await this.gameService.revokeSeasonPass(email);
      this.toastService.success(`Pass revoked for ${email}`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Failed to revoke pass');
    }
  }

  hasNoExpiry(expiresAt: number): boolean {
    return isNoExpiry(expiresAt);
  }

  async makePassPermanent(email: string): Promise<void> {
    this.updatingPassEmail.set(email);
    try {
      await this.gameService.setSeasonPassNoExpiry(email);
      this.toastService.success(`${email} now has a pass that never expires`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Failed to update pass');
    } finally {
      this.updatingPassEmail.set(null);
    }
  }

  formatExpiry(expiresAt: number): string {
    if (isNoExpiry(expiresAt)) return 'Never expires';
    const days = Math.ceil((expiresAt - Date.now()) / 86_400_000);
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  isPassExpired(expiresAt: number): boolean {
    return expiresAt <= Date.now();
  }
}
