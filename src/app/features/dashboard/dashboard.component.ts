import { Component, OnDestroy, OnInit, signal, computed, inject, effect, ChangeDetectionStrategy } from '@angular/core';

import { miniCellClass, miniGridCells, miniGridClass } from '../../core/utils/mini-grid';
import { autoLockAt, groupBoards, isBoardFilling as boardIsFilling, isBoardFull, isReadyToLock } from '../../core/utils/board-groups';
import { drawBoardNumbers } from '../../core/utils/draw-numbers';
import { CardTeam, cardTeams } from '../../core/utils/card-teams';
import { TeamLogoService } from '../../core/services/team-logo.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { GameService, GameListItem, BoardSize } from '../../core/services/game.service';
import { DEFAULT_SPLIT, DEFAULT_EMPTY_QUARTER_RULE, isNoExpiry } from '../../core/plans';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
import { getTeamColors } from '../content/teams-data';
import { ModalComponent } from '../../components/ui/modal/modal.component';
import { CardMenuComponent, CardMenuItem } from '../../components/ui/card-menu/card-menu.component';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { CreateGameFormComponent, CreateGameSubmit } from '../create/create-game-form.component';
import { EditGameDialogComponent, EditGameValues } from '../super-bowl-squares/components/edit-game-dialog/edit-game-dialog.component';
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
  heroLockOpen,
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
  heroMagnifyingGlass,
  heroBars3
} from '@ng-icons/heroicons/outline';


/** The dashboard tour. On a phone, join and create live in the bottom bar, so those two steps say so. */
export function dashboardTourSteps(steps: WalkthroughStep[], phone: boolean): WalkthroughStep[] {
  if (!phone) return steps;
  const phoneText: Record<string, Partial<WalkthroughStep>> = {
    'create-game': { description: 'Tap New board at the bottom of the screen to start your own squares board. You can choose a sport, set points per square, and invite friends.', position: 'top' },
    'join-game': { description: 'Have a game code? Tap Join with a code at the bottom of the screen to join a friend\'s game.', position: 'top' }
  };
  return steps.map(step => ({ ...step, ...phoneText[step.target] }));
}

type CardView = 'grid' | 'compact';
const CARD_VIEW_KEY = 'qs-card-view';

/** The card view this device last chose; Grid until one is chosen. */
function readCardView(): CardView {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(CARD_VIEW_KEY) === 'compact' ? 'compact' : 'grid';
  } catch {
    return 'grid';
  }
}

@Component({
    selector: 'app-dashboard',
    imports: [ModalComponent, FormsModule, RouterLink, NgTemplateOutlet, CardMenuComponent, CreateGameFormComponent, NgIconComponent, AppHeaderComponent, HeadroomDirective, ProfileMenuComponent, ShareDialogComponent, EditGameDialogComponent, UpgradePassDialogComponent],
    providers: [
        provideIcons({
            heroPlus,
            heroArrowRightOnRectangle,
            heroSquares2x2,
            heroShare,
            heroTrash,
            heroLockClosed,
            heroLockOpen,
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
            heroMagnifyingGlass,
            heroBars3
        })
    ],
    template: `
    <div class="min-h-screen bg-qs-bg" [class.qs-grid-view]="cardView() === 'grid'" [attr.inert]="showUpgradeDialog() ? '' : null">
      <!-- Header -->
      <app-shared-header variant="solid" appHeadroom>

        <app-profile-menu walkthroughTarget="profile-dropdown" (tour)="startWalkthrough()"></app-profile-menu>
      </app-shared-header>

      <main class="mx-auto max-w-[1600px] px-4 sm:px-8 pt-6 pb-32 md:pt-8 {{ showSearch() ? 'sm:pb-28' : 'sm:pb-20' }}">
        <!-- Heading + actions -->
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" data-walkthrough="hero-section">
          <div>
            <p class="qs-eyebrow">Dashboard</p>
            <h2 class="qs-title mt-3 text-4xl sm:text-5xl">Your <span class="text-qs-accent">games</span></h2>
          </div>

          <!-- From 640px up: join and create sit top right. Phones get the bottom bar instead. -->
          <div class="hidden gap-3 sm:flex sm:flex-row">
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
                New board
              </button>
            }
          </div>
        </div>

        @if (!canCreateGame()) {
          <div class="mt-8 flex flex-col gap-4 rounded-card border border-qs-line bg-qs-warn-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-qs-warn">
              <span class="font-semibold">You're playing as a guest.</span>
              Sign in to host your own games.
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
                <div class="flex items-center gap-4">
                  @if (myGames().length > 0) {
                    <ng-container *ngTemplateOutlet="viewToggle"></ng-container>
                  }
                  <span class="qs-label text-qs-muted">{{ visibleMyGames().length === myGames().length ? myGames().length : visibleMyGames().length + ' of ' + myGames().length }} {{ myGames().length === 1 ? 'game' : 'games' }}</span>
                </div>
              }
            </div>

            @if (isLoadingGames()) {
              <div class="qs-skel-delay mt-6 grid grid-cols-1 items-start gap-3" [class]="cardGridClass()" aria-busy="true">
                @for (i of [0, 1, 2]; track i) {
                  <!-- Same shape as the board card: a row on a phone, from sm up the navy tile, name, teams and the Share bar -->
                  <div class="min-w-0 [container-type:inline-size]">
                  <article class="qs-card" aria-hidden="true">
                    <div class="flex min-h-[72px] items-center gap-3 p-3 tall:flex-col tall:items-stretch tall:gap-3.5 tall:pb-4">
                      <div class="flex shrink-0 tall:min-h-[152px] tall:items-end tall:gap-[18px] tall:rounded-inner tall:bg-qs-tile tall:p-[18px]">
                        <div class="qs-skel h-12 w-12 tall:h-28 tall:w-28"></div>
                        <div class="hidden flex-col gap-2 pb-0.5 tall:flex">
                          <div class="h-9 w-10 animate-pulse rounded-[6px] bg-white/15"></div>
                          <div class="h-3 w-12 animate-pulse rounded-[6px] bg-white/15"></div>
                        </div>
                      </div>
                      <div class="min-w-0 flex-1 space-y-2 tall:flex-none tall:px-1.5">
                        <div class="qs-skel h-4 w-2/5 tall:h-5 tall:w-3/5"></div>
                        <div class="qs-skel h-3 w-3/5 tall:w-2/5"></div>
                        <div class="qs-skel hidden h-3 w-1/3 tall:block"></div>
                      </div>
                    </div>
                    <div class="hidden min-h-11 border-t border-qs-line tall:block"></div>
                  </article>
                  </div>
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
                <div class="qs-card mt-5 p-8 text-center" role="status">
                  <p class="text-qs-muted">No games match “{{ gameSearch().trim() }}”</p>
                  <button type="button" class="qs-btn qs-btn-secondary mt-4" (click)="clearSearch()">Clear</button>
                </div>
              } @else {
                <!-- Grouped by what the host does next: lock it, keep sharing it, or nothing -->
                @for (group of boardGroups(); track group.key) {
                  <div class="mt-6" role="group" [attr.aria-label]="group.label">
                    <div class="flex items-baseline justify-between border-b border-qs-line px-0.5 pb-2">
                      <h4 class="qs-eyebrow qs-eyebrow-bar">{{ group.label }}</h4>
                      <span class="qs-label text-qs-muted">{{ group.games.length }}</span>
                    </div>
                    <div class="mt-3 grid grid-cols-1 items-start gap-3" [class]="cardGridClass()">
                      @for (game of group.games; track game.id) {
                        <div class="min-w-0 [container-type:inline-size]"><ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: false }"></ng-container></div>
                      }
                    </div>
                  </div>
                }
              }
            }
          </section>
        }

        <!-- Joined -->
        @if (joinedGames().length > 0) {
          <section class="mt-8" aria-labelledby="joined-heading">
            <div class="flex items-baseline justify-between border-b border-qs-line pb-3">
              <h3 id="joined-heading" class="qs-eyebrow qs-eyebrow-bar">{{ canCreateGame() ? '02' : '01' }} / Joined</h3>
              <div class="flex items-center gap-4">
                @if (!canCreateGame() || myGames().length === 0) {
                  <ng-container *ngTemplateOutlet="viewToggle"></ng-container>
                }
                <span class="qs-label text-qs-muted">{{ joinedGames().length }} {{ joinedGames().length === 1 ? 'game' : 'games' }}</span>
              </div>
            </div>
            <div class="mt-5 grid grid-cols-1 items-start gap-3" [class]="cardGridClass()">
              @for (game of joinedGames(); track game.id) {
                <div class="min-w-0 [container-type:inline-size]"><ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: true }"></ng-container></div>
              }
            </div>
          </section>
        }
      </main>

      <!-- Phone: join and create in a bar along the bottom, like the game page's host tools. With enough hosted
           boards a search button sits first; it opens a field with Cancel in the same bar, lifted above the keyboard. -->
      <div
        class="qs-dock no-print fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[90] sm:hidden"
        [class.qs-dock-off]="barHidden()"
        [attr.aria-hidden]="barHidden() ? 'true' : null"
        [style.transform]="searchOpen() && keyboardLift() ? 'translateY(-' + keyboardLift() + 'px)' : null"
      >
        <div role="toolbar" aria-label="Board actions" class="grid grid-cols-1 rounded-[12px] border border-qs-line bg-[color-mix(in_srgb,var(--qs-panel)_88%,transparent)] p-1.5 shadow-pop backdrop-blur-md">
          <div class="qs-swap col-start-1 row-start-1 flex items-stretch gap-1.5" [class.qs-swap-off]="searchOpen()" [class.qs-swap-left]="searchOpen()" [attr.aria-hidden]="searchOpen() ? 'true' : null">
            @if (showSearch()) {
              <button type="button" (click)="openSearch()" class="qs-btn qs-btn-secondary w-11 shrink-0 px-0" aria-label="Search games" [attr.tabindex]="searchOpen() ? -1 : null">
                <ng-icon name="heroMagnifyingGlass" class="text-base" aria-hidden="true"></ng-icon>
              </button>
            }
            <!-- With the search button in the row, Join's label shortens so New board keeps its full name -->
            <button type="button" (click)="showJoinSheet.set(true)" class="qs-btn qs-btn-secondary min-w-0 flex-1" data-walkthrough="join-game" [attr.aria-label]="showSearch() ? 'Join with a code' : null" [attr.tabindex]="searchOpen() ? -1 : null">
              <ng-icon name="heroTicket" class="text-base" aria-hidden="true"></ng-icon>
              {{ showSearch() ? 'Join' : 'Join with a code' }}
            </button>
            @if (canCreateGame()) {
              <button
                type="button"
                (click)="openCreateModal($event)"
                [disabled]="isCheckingBoardLimit()"
                [attr.aria-busy]="isCheckingBoardLimit()"
                [attr.tabindex]="searchOpen() ? -1 : null"
                class="qs-btn qs-btn-ink min-w-0 flex-1 disabled:cursor-wait"
                data-walkthrough="create-game"
              >
                <ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon>
                New board
              </button>
            }
          </div>
          @if (showSearch()) {
            <div class="qs-swap col-start-1 row-start-1 flex items-stretch gap-1.5" [class.qs-swap-off]="!searchOpen()" [class.qs-swap-right]="!searchOpen()" [attr.aria-hidden]="searchOpen() ? null : 'true'" role="search">
              <ng-container *ngTemplateOutlet="searchField; context: { $implicit: 'phone' }"></ng-container>
              <button type="button" (click)="closeSearch()" class="qs-btn qs-btn-secondary shrink-0" [attr.tabindex]="searchOpen() ? null : -1">Cancel</button>
            </div>
          }
        </div>
      </div>

      <!-- From 640px up: with enough hosted boards, a search pill floats at the bottom center like the game page's host tools -->
      @if (showSearch()) {
        <div
          class="qs-dock no-print fixed inset-x-3 bottom-4 z-[90] mx-auto hidden max-w-fit sm:block"
          [class.qs-dock-off]="barHidden()"
          [attr.aria-hidden]="barHidden() ? 'true' : null"
          animate.enter="qs-dock-enter"
          animate.leave="qs-dock-leave"
        >
          <div role="search" class="rounded-[12px] border border-qs-line bg-[color-mix(in_srgb,var(--qs-panel)_88%,transparent)] p-2 shadow-pop backdrop-blur-md">
            <ng-container *ngTemplateOutlet="searchField; context: { $implicit: 'desk' }"></ng-container>
          </div>
        </div>
      }

      <ng-template #searchField let-where>
        <div class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-btn border border-qs-line-strong bg-qs-panel pl-3 pr-1 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-qs-ink" [class.sm:w-80]="where === 'desk'">
          <ng-icon name="heroMagnifyingGlass" class="shrink-0 text-base text-qs-muted" aria-hidden="true"></ng-icon>
          <input
            #searchInput
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            [attr.data-search]="where"
            [value]="gameSearch()"
            (input)="gameSearch.set($any($event.target).value)"
            (keydown.escape)="onSearchEscape(where)"
            (keydown.enter)="$any($event.target).blur()"
            placeholder="Search games"
            aria-label="Search games"
            [attr.tabindex]="where === 'phone' && !searchOpen() ? -1 : null"
            class="qs-search-input min-w-0 flex-1 bg-transparent text-base text-qs-ink placeholder:text-qs-muted focus:outline-none"
          />
          @if (gameSearch()) {
            <button type="button" (click)="clearSearch(where)" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-qs-muted hover:text-qs-ink" aria-label="Clear search" [attr.tabindex]="where === 'phone' && !searchOpen() ? -1 : null">
              <ng-icon name="heroXMark" class="text-base" aria-hidden="true"></ng-icon>
            </button>
          }
        </div>
      </ng-template>

      <!-- Phone: the code field, in a sheet from the bottom bar -->
      <app-modal [open]="showJoinSheet()" labelledBy="join-sheet-title" size="sm" motion="slide" extraClass="pt-2" (dismissed)="showJoinSheet.set(false)">
        <span class="mx-auto mb-1 mt-0.5 block h-1 w-10 rounded bg-qs-line-strong" aria-hidden="true"></span>
        <div class="px-5 pb-6 pt-3">
          <h3 id="join-sheet-title" class="qs-title text-2xl">Join with a code</h3>
          <p class="mt-1 text-sm text-qs-muted">Enter the six-character code your host shared.</p>
          <div class="mt-4 flex min-h-11 items-stretch overflow-hidden rounded-btn border border-qs-line-strong bg-qs-panel focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-qs-ink">
            <label for="join-code-sheet" class="qs-label flex items-center border-r border-qs-line bg-qs-panel-2 px-3 text-qs-muted whitespace-nowrap">Code</label>
            <input
              id="join-code-sheet"
              type="text"
              [(ngModel)]="joinGameCode"
              placeholder="ABC123"
              maxlength="6"
              autocomplete="off"
              autocapitalize="characters"
              data-autofocus
              class="w-full min-w-0 bg-transparent px-3 font-mono text-base uppercase tracking-[0.3em] text-qs-ink placeholder:text-qs-muted/60 focus:outline-none"
              (keyup.enter)="joinGame()"
            />
            <button type="button" (click)="joinGame()" [disabled]="joinGameCode.length !== 6" class="qs-btn qs-btn-ink rounded-none">Join</button>
          </div>
        </div>
      </app-modal>

      <!-- Grid or Compact cards. From 640px up only: phones always show the compact row. -->
      <ng-template #viewToggle>
        <div role="group" aria-label="Card view" class="hidden items-center rounded-btn border border-qs-line bg-qs-panel p-0.5 sm:inline-flex">
          @for (v of cardViews; track v.id) {
            <button
              type="button"
              (click)="setCardView(v.id)"
              [attr.aria-pressed]="cardView() === v.id"
              class="flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-qs-accent"
              [class]="cardView() === v.id ? 'bg-qs-ink text-qs-bg' : 'text-qs-muted hover:text-qs-ink'"
            >
              <ng-icon [name]="v.icon" class="text-sm" aria-hidden="true"></ng-icon>{{ v.label }}
            </button>
          }
        </div>
      </ng-template>

      <ng-template #gameCard let-game let-joined="joined">
        <!-- Phone: a row (mini board, name, teams, open count). From sm up: the board on a navy panel with the open count beside it.
             Filling boards get a full-width Share invite bar; locked and full boards go quiet. -->
        <article animate.enter="qs-fade-rise" class="qs-card relative min-w-0 transition-[border-color] duration-150 ease-out has-[a:hover]:border-qs-ink has-[[aria-expanded=true]]:z-20">
          <div class="relative flex items-center tall:block">
            <a
              [routerLink]="['/game', game.id]"
              [state]="{ boardSize: game.boardSize }"
              class="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-tl-card py-3 pl-3 pr-2 transition-colors duration-150 hover:bg-qs-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-qs-accent tall:flex-col tall:items-stretch tall:gap-3.5 tall:rounded-tr-card tall:p-3 tall:pb-4"
              [class]="hasCardBar(game, joined) ? '' : 'rounded-bl-card tall:rounded-br-card'"
              [attr.aria-label]="'Open ' + game.name"
            >
              <div class="flex shrink-0 flex-col items-center tall:min-h-[152px] tall:flex-row tall:items-end tall:gap-[18px] tall:rounded-inner tall:bg-qs-tile tall:p-[18px]">
                <div [class]="'qs-mini grid w-14 shrink-0 gap-px rounded-[3px] p-px tall:w-28 ' + getMiniGridClass(game.boardSize)" aria-hidden="true">
                  @for (i of getBoardCells(game.boardSize); track i) {
                    <span class="aspect-square" [class]="miniCellClass(game, i)"></span>
                  }
                </div>
                <!-- Phone: the state sits centered under the mini board -->
                <p class="qs-label mt-1.5 flex w-[4.25rem] items-center justify-center gap-1 whitespace-nowrap text-xs tabular-nums tall:hidden" [class]="isBoardFilling(game) ? 'text-qs-accent' : 'text-qs-muted'">
                  @if (game.isLocked) {
                    <span class="lock-icon is-locked shrink-0" [class.lock-snap]="justLocked().has(game.id)" style="font-size: 12px" aria-hidden="true"><ng-icon name="heroLockClosed" class="lock-closed"></ng-icon><ng-icon name="heroLockOpen" class="lock-open"></ng-icon></span>Locked
                  } @else if (!isBoardFilling(game)) {
                    Full
                  } @else {
                    {{ openCount(game) }} open
                  }
                </p>
                <div class="hidden min-w-0 flex-col gap-1.5 pb-0.5 tall:flex">
                  @if (game.isLocked) {
                    <span class="qs-label inline-flex items-center gap-1.5 text-qs-tile-ink"><span class="lock-icon is-locked" [class.lock-snap]="justLocked().has(game.id)" style="font-size: 14px" aria-hidden="true"><ng-icon name="heroLockClosed" class="lock-closed"></ng-icon><ng-icon name="heroLockOpen" class="lock-open"></ng-icon></span>Locked</span>
                  } @else if (!isBoardFilling(game)) {
                    <span class="qs-label text-qs-tile-ink">Full</span>
                    @if (autoLockText(game); as autoLock) {
                      <span class="text-[13px] text-qs-tile-muted">Auto-locks {{ autoLock }}</span>
                    }
                  } @else {
                    <strong class="text-[40px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums text-qs-tile-count">{{ openCount(game) }}</strong>
                    <span class="qs-label text-qs-tile-count">open</span>
                    <span class="text-[13px] tabular-nums text-qs-tile-muted">of {{ game.boardSize || 100 }}</span>
                  }
                </div>
              </div>
              <div class="min-w-0 tall:px-1.5">
                <h5 class="truncate text-base font-semibold leading-tight tracking-tight text-qs-ink tall:text-xl">{{ game.name }}</h5>
                @if (cardTeams(game); as teams) {
                  <div class="mt-1.5 flex flex-col gap-1">
                    @for (team of teams; track $index) {
                      <span class="flex min-w-0 items-center gap-2 text-sm">
                        @if (team.logo) {
                          <img [src]="team.logo" alt="" width="20" height="20" loading="lazy" class="h-5 w-5 shrink-0 object-contain" />
                        }
                        @if (team.code) {
                          <span class="shrink-0 font-semibold text-qs-ink">{{ team.code }}</span>
                        }
                        @if (team.name) {
                          <span class="truncate" [class]="team.code ? 'text-qs-muted' : 'text-qs-ink'">{{ team.name }}</span>
                        }
                      </span>
                    }
                  </div>
                } @else {
                  <p class="mt-0.5 truncate text-sm text-qs-muted">Teams not set</p>
                }
                @if (!game.isLocked && !isBoardFilling(game) && autoLockText(game); as autoLock) {
                  <p class="mt-1 truncate text-[13px] text-qs-muted tall:hidden">Auto-locks {{ autoLock }}</p>
                }
              </div>
            </a>
            <app-card-menu
              class="shrink-0 pr-1 tall:absolute tall:right-[18px] tall:top-[18px] tall:pr-0"
              triggerClass="tall:text-qs-tile-muted tall:hover:bg-white/10 tall:hover:text-qs-tile-ink tall:focus-visible:outline-qs-tile-ink"
              [items]="joined ? joinedMenu : hostMenu"
              [label]="'More actions for ' + game.name"
              (picked)="onCardMenu(game, $event)"></app-card-menu>
          </div>
          @if (isBoardFilling(game)) {
            <button
              type="button"
              (click)="shareGame(game.id)"
              class="flex min-h-11 w-full items-center justify-center gap-2 rounded-b-card border-t border-qs-line bg-qs-panel text-sm font-medium text-qs-ink transition-colors duration-150 hover:bg-qs-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-qs-ink"
              [attr.aria-label]="'Share invite for ' + game.name"
            >
              <ng-icon name="heroShare" class="text-base" aria-hidden="true"></ng-icon>
              Share invite
            </button>
          } @else if (canLockFromCard(game, joined)) {
            <button
              type="button"
              (click)="lockNow(game)"
              [disabled]="lockingIds().has(game.id)"
              class="lock-preview flex min-h-11 w-full items-center justify-center gap-2 rounded-b-card border-t border-qs-line bg-qs-panel text-sm font-medium text-qs-ink transition-colors duration-150 hover:bg-qs-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-qs-ink disabled:cursor-wait disabled:text-qs-muted"
              [attr.aria-label]="'Lock ' + game.name + ' now'"
            >
              <span class="lock-icon" [class.is-locked]="lockingIds().has(game.id)" aria-hidden="true"><ng-icon name="heroLockClosed" class="lock-closed"></ng-icon><ng-icon name="heroLockOpen" class="lock-open"></ng-icon></span>
              {{ lockingIds().has(game.id) ? 'Locking' : 'Lock now' }}
            </button>
          }
        </article>
      </ng-template>

      <!-- Create Game Modal -->
      <app-modal [open]="showCreateModal()" labelledBy="create-game-title" size="xl" phone="full" [backdropCloses]="false" extraClass="flex h-[min(44rem,calc(100dvh-2rem))] flex-col overflow-hidden" (dismissed)="dismissCreateModal()">
        <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-4 pt-5 max-sm:pb-3 max-sm:pt-4">
          <div>
            <p class="qs-eyebrow max-sm:hidden">New board</p>
            <h3 id="create-game-title" class="qs-title mt-2 text-3xl max-sm:mt-0 max-sm:text-2xl">Set up your <span class="text-qs-accent">board</span></h3>
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
          [autoManageAllowed]="planService.features().autoManage"
          [autoManageDefault]="autoManageDefault()"
          [squareLimitAllowed]="planService.features().squareLimit"
          [isCreating]="isCreating()"
          (cancelled)="closeCreateModal()"
          (submitted)="createGame($event)"
        ></app-create-game-form>
      </app-modal>

      <!-- Share Modal -->
      <app-share-dialog [isOpen]="!!shareModalGameId()" [gameId]="shareModalGameId() || ''" (closed)="shareModalGameId.set(null)"></app-share-dialog>

      <!-- Edit Game Modal -->
      <app-edit-game-dialog
        [isOpen]="showEditModal()"
        [showGameFields]="true"
        [closeOnSave]="false"
        [saving]="isSavingGame()"
        [values]="editValues()"
        [boardSize]="editingGame()?.boardSize ?? 100"
        [squaresFilled]="editingGame()?.squaresFilled ?? 0"
        [numbersDrawn]="editBoardRandomized()"
        [espnGames]="editEspnGames()"
        [loadingEspnGames]="isLoadingEditEspnGames()"
        [canAutoManage]="planService.features().autoManage && !editingGame()?.isLocked"
        [canShowInOpenBoards]="canEditShowInOpenBoards()"
        [canLimitSquares]="planService.features().squareLimit && !!editingGame()"
        [players]="editGamePlayers()"
        [coHostName]="editingGame()?.managerId ? (editingGame()?.managerName || editingGame()?.managerEmail || 'Assigned') : ''"
        (closed)="closeEditModal()"
        (saved)="saveGameEdits($event)"
        (sportChange)="fetchEditEspnGames($event)"
        (coHostAssign)="assignManagerFromPlayer($event)"
        (coHostRemove)="removeManager()"
      ></app-edit-game-dialog>

    </div>
    @if (showUpgradeDialog()) {
      <app-upgrade-pass-dialog [trigger]="upgradeTrigger()" [boardName]="endedBoard()?.name ?? ''" (dismissed)="closeUpgrade()" (resetOld)="resetOldBoard()" (deleteOld)="deleteOldBoard()" />
    }
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    /* Mini board on each card. Filling: open squares carry the one accent, claimed squares are neutral.
       Locked or full: taken squares are filled and empty ones are left blank. From sm up the board sits on the navy tile. */
    .qs-mini { background: var(--qs-line); }
    .qs-mini-open { background: color-mix(in srgb, var(--qs-accent) 38%, var(--qs-panel)); }
    .qs-mini-claimed, .qs-mini-taken { background: color-mix(in srgb, var(--qs-line-strong) 40%, var(--qs-panel)); }
    .qs-mini-blank { background: var(--qs-panel); }
    @container (min-width: 28rem) {
      .qs-mini { background: color-mix(in srgb, var(--qs-tile-ink) 10%, var(--qs-tile)); }
      .qs-mini-open { background: var(--qs-tile-open); }
      .qs-mini-claimed { background: color-mix(in srgb, var(--qs-tile-ink) 20%, var(--qs-tile)); }
      .qs-mini-taken { background: color-mix(in srgb, var(--qs-tile-ink) 36%, var(--qs-tile)); }
      .qs-mini-blank { background: var(--qs-tile); }
    }
    /* Grid view: the tall card from 640px up, whatever the card's width (same as the tall: variant) */
    @media (min-width: 640px) {
      .qs-grid-view .qs-mini { background: color-mix(in srgb, var(--qs-tile-ink) 10%, var(--qs-tile)); }
      .qs-grid-view .qs-mini-open { background: var(--qs-tile-open); }
      .qs-grid-view .qs-mini-claimed { background: color-mix(in srgb, var(--qs-tile-ink) 20%, var(--qs-tile)); }
      .qs-grid-view .qs-mini-taken { background: color-mix(in srgb, var(--qs-tile-ink) 36%, var(--qs-tile)); }
      .qs-grid-view .qs-mini-blank { background: var(--qs-tile); }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private espnService = inject(EspnService);
  private teamLogos = inject(TeamLogoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);
  private walkthroughService = inject(WalkthroughService);
  private sanitizationService = inject(SanitizationService);

  constructor() {
    // The phone keyboard covers fixed elements on iOS, so the open search lifts by the covered height
    effect(onCleanup => {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!this.searchOpen() || !vv) {
        this.keyboardLift.set(0);
        return;
      }
      const update = (): void => this.keyboardLift.set(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
      update();
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      onCleanup(() => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      });
    });
    // Search goes away below six boards, so the phone bar can't stay stuck on an empty field
    effect(() => {
      if (!this.showSearch()) this.searchOpen.set(false);
    });
    // Toasts lift above the desktop search pill too
    effect(() => {
      const pill = this.showSearch() && !this.barHidden();
      if (typeof document !== 'undefined') document.body.classList.toggle('has-host-bar', pill);
    });
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
      title: 'Create a new board',
      description: 'Tap here to start your own squares board. You can choose a sport, set points per square, and invite friends.',
      position: 'bottom'
    },
    {
      target: 'join-game',
      title: 'Join with a code',
      description: 'Have a 6-digit game code? Enter it here to join a friend\'s game instantly.',
      position: 'bottom'
    },
    {
      target: 'my-games',
      title: 'Your games',
      description: 'All the games you\'ve created will appear here. You can manage, share, or delete them anytime.',
      position: 'top'
    },
    {
      target: 'profile-dropdown',
      title: 'Your profile',
      description: 'Tap here to update your display name, change the theme, or sign out.',
      position: 'bottom'
    }
  ];

  currentUser = this.authService.currentUser;
  canCreateGame = this.authService.canCreateGame;
  protected planService = inject(PlanService);
  protected readonly Infinity = Infinity;

  myGames = signal<GameListItem[]>([]);
  /** Grid shows the tall cards from 640px up, as before; Compact shows every board as a short row. Remembered on this device. */
  cardView = signal<CardView>(readCardView());
  readonly cardViews: ReadonlyArray<{ id: CardView; label: string; icon: string }> = [
    { id: 'grid', label: 'Grid', icon: 'heroSquares2x2' },
    { id: 'compact', label: 'Compact', icon: 'heroBars3' },
  ];
  /** Board columns: two or three tall cards in Grid; as many 19rem rows as fit in Compact. */
  cardGridClass = computed(() => this.cardView() === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-[repeat(auto-fill,minmax(19rem,1fr))]');
  /** The search query. Only applies while search shows. */
  gameSearch = signal('');
  /** Search shows once a host has this many boards. Temporarily 1 so it can be tried on any dashboard; the plan is 6. */
  readonly searchMinBoards = 1;
  showSearch = computed(() => !this.isLoadingGames() && this.myGames().length >= this.searchMinBoards);
  /** Phone: the bottom bar shows the search field and Cancel in place of Join and New board. */
  searchOpen = signal(false);
  /** Phone: how far the keyboard covers the bottom of the screen, so the open search rides above it. */
  keyboardLift = signal(0);
  /** Hosted boards matching the search, newest first. */
  visibleMyGames = computed(() => {
    const query = this.showSearch() ? this.gameSearch().trim().toLowerCase() : '';
    return this.myGames()
      .filter(g => !query || [g.name, g.homeTeam, g.awayTeam, g.id].some(v => (v || '').toLowerCase().includes(query)))
      .sort((a, b) => b.createdAt - a.createdAt);
  });
  /** Hosted boards grouped by what the host does next. Empty groups are left out. */
  boardGroups = computed(() => groupBoards(this.visibleMyGames()));
  /** Boards locked from their card in the last moment, so their lock plays the snap-shut animation once. */
  justLocked = signal<ReadonlySet<string>>(new Set());
  /** Boards whose Lock now is being saved. */
  lockingIds = signal<ReadonlySet<string>>(new Set());
  joinedGames = signal<GameListItem[]>([]);

  /** Get cells array for mini board preview based on board size */
  getBoardCells(size: BoardSize): number[] {
    return miniGridCells(size);
  }

  /** True while a board is unlocked and still has open squares, so Share is worth offering. */
  isBoardFilling(game: GameListItem): boolean {
    return boardIsFilling(game);
  }

  /** Full or locked boards need nothing sold: taken squares are filled and empty ones are left blank. */
  isBoardQuiet(game: GameListItem): boolean {
    return game.isLocked || isBoardFull(game);
  }

  /** One mini-board square: open or claimed while filling, blank or taken once the board is quiet. */
  miniCellClass(game: GameListItem, index: number): string {
    return miniCellClass(index, game.squaresFilled, this.isBoardQuiet(game));
  }

  /** "Sun 7:25 PM" when Auto-lock and draw will lock this full board, or '' when it is off or its time has passed. */
  autoLockText(game: GameListItem): string {
    const runAt = autoLockAt(game);
    if (!runAt) return '';
    const soon = runAt - Date.now() < 6 * 86_400_000;
    return new Intl.DateTimeFormat(undefined, soon
      ? { weekday: 'short', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(runAt);
  }

  /** Only the host locks from the card, and only a full board that is still open (the game page handles shrinking a half-empty one). */
  canLockFromCard(game: GameListItem, joined: boolean): boolean {
    return !joined && isReadyToLock(game);
  }

  /** Filling cards carry Share invite; Ready to lock cards carry Lock now for the host. */
  hasCardBar(game: GameListItem, joined: boolean): boolean {
    return this.isBoardFilling(game) || this.canLockFromCard(game, joined);
  }

  /** Lock now on a Ready to lock card: same write as the game page's Lock button, which also turns Auto-lock and draw off. */
  async lockNow(game: GameListItem): Promise<void> {
    if (this.lockingIds().has(game.id)) return;
    const auto = !!game.autoManage?.enabled;
    const draws = !game.isRandomized;
    const ok = await this.confirmService.ask({
      title: `Lock ${game.name}?`,
      message: `Players can't pick or change squares once it's locked.${draws ? ' The numbers are drawn now.' : ''}${auto ? ' Auto-lock and draw turns off for this board.' : ''}`,
      confirmLabel: draws ? 'Lock and draw numbers' : 'Lock board',
      tone: 'primary',
      rememberKey: 'lock-board'
    });
    if (!ok) return;
    this.lockingIds.update(ids => new Set(ids).add(game.id));
    try {
      // Locking draws the numbers in the same save, as auto lock does; drawn numbers stay as they are.
      await this.gameService.updateGame(game.id, draws
        ? { isLocked: true, ...drawBoardNumbers(game.boardSize || 100), isRandomized: true, winners: {} }
        : { isLocked: true });
      if (auto) {
        await this.gameService.setAutoManage(game.id, null).catch(() =>
          this.toastService.warning('Locked, but Auto-lock and draw could not be turned off. Turn it off in Edit game.'));
      }
      this.justLocked.update(ids => new Set(ids).add(game.id));
      this.myGames.update(games => games.map(g => g.id === game.id ? { ...g, isLocked: true, isRandomized: true, autoManage: undefined } : g));
      setTimeout(() => this.justLocked.update(ids => { const next = new Set(ids); next.delete(game.id); return next; }), 1200);
    } catch {
      this.toastService.error('Could not lock the board. Try again.');
    } finally {
      this.lockingIds.update(ids => { const next = new Set(ids); next.delete(game.id); return next; });
    }
  }

  /** Squares still free, shown beside the mini board. */
  openCount(game: GameListItem): number {
    return Math.max(0, (game.boardSize || 100) - game.squaresFilled);
  }

  /** The card's one line: the teams playing. */
  /** The card's two team lines, away first; null shows "Teams not set". */
  cardTeams(game: GameListItem): CardTeam[] | null {
    return cardTeams(game.awayTeam, game.homeTeam, game.espnSport, this.teamLogos.teams(game));
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
  editValues = signal<EditGameValues>({ awayTeam: '', homeTeam: '', pricePerSquare: 10, hostNote: '', quarterSplit: null, emptyQuarterRule: DEFAULT_EMPTY_QUARTER_RULE, newBoardSize: null, showInOpenBoards: false, autoManage: false, maxSquaresPerPlayer: null });
  editEspnGames = signal<EspnGame[]>([]);
  isLoadingEditEspnGames = signal(false);
  editGamePlayers = signal<{ name: string; uid: string }[]>([]);
  editBoardRandomized = signal(false);
  autoManageDefault = signal(true);
  isSavingGame = signal(false);

  // Profile dropdown state

  joinGameCode = '';
  /** Phone: the Join with a code sheet opened from the bottom bar. */
  showJoinSheet = signal(false);
  /** The bottom bar and the search pill step out of the way while a sheet or dialog is open. */
  barHidden = computed(() => this.showJoinSheet() || this.showCreateModal() || this.showEditModal() || this.showUpgradeDialog() || !!this.shareModalGameId());

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.classList.remove('has-phone-bar', 'has-host-bar');
  }

  ngOnInit(): void {
    // Lifts toasts above the phone bottom bar
    if (typeof document !== 'undefined') document.body.classList.add('has-phone-bar');
    this.loadMyGames();
    this.authService.waitForAuthReady().then(() => {
      const uid = this.currentUser()?.uid;
      if (uid) this.gameService.getAutoManageDefault(uid).then(on => this.autoManageDefault.set(on));
    });
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
      // The signed-out form cannot see the plan or the profile switch, so it saved Auto-lock and draw as off. Apply the real default here.
      const wantAuto = isPendingAutoSubmit(draft) && this.planService.features().autoManage && await this.gameService.getAutoManageDefault(user.uid);
      const readyDraft = draft && wantAuto ? { ...draft, autoManage: true } : draft;
      const built = readyDraft && isPendingAutoSubmit(draft) ? buildCreateGameValues(readyDraft, this.sanitizationService, this.planService.features().customSplits) : null;
      if (readyDraft && built?.ok) {
        await this.createGame({ draft: readyDraft, values: built.values });
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
    // The tour points at Join and New board, which the open search covers on a phone
    if (this.searchOpen()) this.closeSearch();
    this.walkthroughService.resetCompletion('dashboard');
    this.walkthroughService.start('dashboard', dashboardTourSteps(this.dashboardWalkthroughSteps, window.innerWidth < 640));
  }

  clearSearch(where?: 'phone' | 'desk'): void {
    this.gameSearch.set('');
    if (where) this.searchInput(where)?.focus();
  }

  closeSearch(): void {
    this.gameSearch.set('');
    this.searchOpen.set(false);
    this.searchInput('phone')?.blur();
  }

  onSearchEscape(where: 'phone' | 'desk'): void {
    if (where === 'phone') this.closeSearch();
    else this.gameSearch.set('');
  }

  openSearch(): void {
    this.searchOpen.set(true);
    // Focus inside the tap itself so iOS raises the keyboard; the field is already in the bar, only faded out
    this.searchInput('phone')?.focus({ preventScroll: true });
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
        this.toastService.error('Could not load your games. Try again.');
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
        this.toastService.error('Could not check your boards. Try again.');
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
    if (!await this.confirmService.ask({ title: 'Reset this game?', message: 'Squares, numbers and scores are cleared. Players keep your link.', confirmLabel: 'Reset game' })) return;
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
    if (!await this.confirmService.ask({ title: 'Delete this game?', message: `${board.name} will be removed for everyone. This cannot be undone.`, confirmLabel: 'Delete game' })) return;
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

  /** Esc: close but keep the entries, so reopening restores them. The X and Cancel clear the draft. */
  dismissCreateModal(): void {
    this.showCreateModal.set(false);
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
      if (values.maxSquaresPerPlayer && this.planService.features().squareLimit) {
        try {
          await this.gameService.setSquareLimit(gameId, values.maxSquaresPerPlayer);
        } catch {
          this.toastService.warning('Board created, but the squares limit could not be set. Try again in Edit.');
        }
      }
      if (values.autoManage && this.planService.features().autoManage) {
        try {
          await this.gameService.setAutoManage(gameId, { enabled: true, resize: true }, values.kickoffAt);
        } catch {
          this.toastService.warning('Board created, but Auto-lock and draw could not be turned on. Try again in Edit.');
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
        this.toastService.error('Could not create the game. Try again.');
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

  setCardView(view: CardView): void {
    this.cardView.set(view);
    try {
      localStorage.setItem(CARD_VIEW_KEY, view);
    } catch {
      // Storage blocked: the choice lasts until the page reloads
    }
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

  hostMenu: CardMenuItem[] = [{ id: 'edit', label: 'Edit game' }, { id: 'delete', label: 'Delete game', danger: true }];
  joinedMenu: CardMenuItem[] = [{ id: 'remove', label: 'Remove from my list' }];

  onCardMenu(game: GameListItem, action: string): void {
    if (action === 'edit') this.openEditModal(game);
    else if (action === 'delete') void this.deleteGame(game.id);
    else if (action === 'remove') void this.removeJoinedGame(game.id);
  }

  async deleteGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    const name = this.myGames().find(g => g.id === gameId)?.name ?? 'This game';
    if (await this.confirmService.ask({ title: 'Delete this game?', message: `${name} will be removed for everyone. This cannot be undone.`, confirmLabel: 'Delete game' })) {
      try {
        await this.gameService.deleteGame(gameId, user.uid);
        this.myGames.update(games => games.filter(g => g.id !== gameId));
      } catch (error) {
        this.toastService.error('Could not delete the game. Try again.');
      }
    }
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
    if (await this.authService.signOut()) this.router.navigate(['/']);
  }

  // Edit modal methods
  async openEditModal(game: GameListItem): Promise<void> {
    const isCustomGame = !game.espnEventId;
    this.editingGame.set(game);
    this.editValues.set({
      name: game.name,
      sport: isCustomGame ? 'custom' : (game.espnSport || 'nfl'),
      espnGameId: game.espnEventId || '',
      awayTeam: game.awayTeam || '',
      homeTeam: game.homeTeam || '',
      pricePerSquare: game.pricePerSquare,
      hostNote: game.hostNote || '',
      quarterSplit: null,
      emptyQuarterRule: game.emptyQuarterRule ?? DEFAULT_EMPTY_QUARTER_RULE,
      newBoardSize: null,
      showInOpenBoards: !!game.showInOpenBoards,
      autoManage: !!game.autoManage,
      maxSquaresPerPlayer: game.maxSquaresPerPlayer ?? null
    });
    this.editBoardRandomized.set(false);
    this.showEditModal.set(true);
    if (!isCustomGame) {
      this.fetchEditEspnGames(game.espnSport || 'nfl');
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

  canEditShowInOpenBoards(): boolean {
    const g = this.editingGame();
    return !!g && this.planService.features().activeBoards > 1 && (!!g.showInOpenBoards || (!g.isLocked && g.squaresFilled < g.boardSize));
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGame.set(null);
    this.editGamePlayers.set([]);
    this.editEspnGames.set([]);
  }

  async fetchEditEspnGames(sport: SportType | 'custom'): Promise<void> {
    if (sport === 'custom') {
      this.editEspnGames.set([]);
      return;
    }
    this.isLoadingEditEspnGames.set(true);
    try {
      const games = await this.espnService.getGames(sport);
      this.editEspnGames.set(games);
    } finally {
      this.isLoadingEditEspnGames.set(false);
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
    } catch (error) {
      this.toastService.error('Could not assign the co-host. Try again.');
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
      this.toastService.error('Could not remove the co-host. Try again.');
    }
  }

  async saveGameEdits(v: EditGameValues): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    const sanitizedName = this.sanitizationService.sanitizeGameName(v.name ?? '');
    const sanitizedPrice = this.sanitizationService.validatePrice(v.pricePerSquare);
    const sanitizedHostNote = this.sanitizationService.sanitizeHostNote(v.hostNote);

    this.isSavingGame.set(true);
    try {
      const selectedEspnGame = this.editEspnGames().find(g => g.id === v.espnGameId);
      const espnChanged = (v.espnGameId || undefined) !== game.espnEventId;

      // Determine team names: custom game uses edited fields, ESPN game uses selected game
      let homeTeam: string;
      let awayTeam: string;
      if (v.sport === 'custom') {
        homeTeam = this.sanitizationService.sanitizeTeamName(v.homeTeam) || game.homeTeam || '';
        awayTeam = this.sanitizationService.sanitizeTeamName(v.awayTeam) || game.awayTeam || '';
      } else {
        homeTeam = selectedEspnGame?.homeTeam || game.homeTeam || '';
        awayTeam = selectedEspnGame?.awayTeam || game.awayTeam || '';
      }

      const updates: Record<string, any> = {
        name: sanitizedName,
        pricePerSquare: sanitizedPrice,
        hostNote: sanitizedHostNote,
        emptyQuarterRule: v.emptyQuarterRule,
        espnEventId: v.espnGameId || null,
        espnSport: v.espnGameId && v.sport !== 'custom' ? v.sport : null,
        homeTeam,
        awayTeam
      };
      if (espnChanged) {
        updates['scores'] = { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } };
        updates['winners'] = {};
      }
      const newSize = v.newBoardSize;
      if (newSize) await this.gameService.resizeBoard(game.id, newSize);
      await this.gameService.updateGame(game.id, updates);
      // The open-boards switch saves on its own so a failure here never loses the other edits.
      let showApplied = !!game.showInOpenBoards;
      const uid = this.currentUser()?.uid;
      if (uid && v.showInOpenBoards !== showApplied) {
        try {
          await this.gameService.setShowInOpenBoards(game.id, uid, v.showInOpenBoards);
          showApplied = v.showInOpenBoards;
        } catch {
          this.toastService.warning('Saved, but Show in my open boards could not be changed. Try again in a moment.');
        }
      }
      let limitApplied = game.maxSquaresPerPlayer;
      if (this.planService.features().squareLimit && (v.maxSquaresPerPlayer ?? undefined) !== game.maxSquaresPerPlayer) {
        try {
          await this.gameService.setSquareLimit(game.id, v.maxSquaresPerPlayer);
          limitApplied = v.maxSquaresPerPlayer ?? undefined;
        } catch {
          this.toastService.warning('Saved, but the squares limit could not be changed. Try again in a moment.');
        }
      }
      let autoApplied = game.autoManage;
      const wantAuto = this.planService.features().autoManage && !!v.espnGameId && v.autoManage;
      if (!!wantAuto !== !!game.autoManage || (wantAuto && espnChanged)) {
        try {
          autoApplied = wantAuto ? { enabled: true, resize: true } : undefined;
          const picked = this.editEspnGames().find(g => g.id === v.espnGameId)?.date;
          await this.gameService.setAutoManage(game.id, autoApplied ?? null, picked ? Date.parse(picked) : undefined);
        } catch {
          autoApplied = game.autoManage;
          this.toastService.warning('Saved, but Auto-lock and draw could not be changed. Try again in a moment.');
        }
      }
      this.myGames.update(games =>
        games.map(g => g.id === game.id ? {
          ...g,
          ...(newSize ? { boardSize: newSize } : {}),
          showInOpenBoards: showApplied,
          autoManage: autoApplied,
          maxSquaresPerPlayer: limitApplied,
          name: sanitizedName,
          pricePerSquare: sanitizedPrice,
          hostNote: sanitizedHostNote,
          emptyQuarterRule: v.emptyQuarterRule,
          espnEventId: v.espnGameId || undefined,
          espnSport: v.espnGameId && v.sport !== 'custom' ? v.sport : undefined,
          homeTeam,
          awayTeam,
          ...(espnChanged ? { scores: { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } }, winners: {} } : {})
        } : g)
      );
      this.closeEditModal();
    } catch (error) {
      this.toastService.error('Could not save changes. Try again.');
    } finally {
      this.isSavingGame.set(false);
    }
  }

  // Profile dropdown methods

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
      this.toastService.error('Could not load gifted passes. Try again.');
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
      this.toastService.error('Could not grant the season pass. Try again.');
    } finally {
      this.isGrantingPass.set(false);
    }
  }

  async revokePass(email: string): Promise<void> {
    if (!await this.confirmService.ask({ title: 'Revoke season pass?', message: email, confirmLabel: 'Revoke pass' })) return;
    try {
      await this.gameService.revokeSeasonPass(email);
      this.toastService.success(`Pass revoked for ${email}`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Could not revoke the pass. Try again.');
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
      this.toastService.error('Could not update the pass. Try again.');
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

  private searchInput(where: 'phone' | 'desk'): HTMLInputElement | null {
    return typeof document !== 'undefined' ? document.querySelector<HTMLInputElement>(`input[data-search="${where}"]`) : null;
  }
}
