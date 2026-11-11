import { Component, OnInit, signal, computed, inject, effect, ChangeDetectionStrategy } from '@angular/core';

import { miniGridCells, miniGridClass } from '../../core/utils/mini-grid';
import { groupBoards, isBoardFilling as boardIsFilling, isBoardFull } from '../../core/utils/board-groups';
import { DropdownComponent } from '../../components/ui/dropdown/dropdown.component';
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
type GameStatusFilter = 'all' | 'open' | 'locked' | 'private' | 'public';

@Component({
    selector: 'app-dashboard',
    imports: [ModalComponent, FormsModule, RouterLink, NgTemplateOutlet, DropdownComponent, CardMenuComponent, CreateGameFormComponent, NgIconComponent, AppHeaderComponent, HeadroomDirective, ProfileMenuComponent, ShareDialogComponent, EditGameDialogComponent, UpgradePassDialogComponent],
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
    <div class="min-h-screen bg-qs-bg" [attr.inert]="showUpgradeDialog() ? '' : null">
      <!-- Header -->
      <app-shared-header variant="solid" appHeadroom>

        <app-profile-menu walkthroughTarget="profile-dropdown" (tour)="startWalkthrough()"></app-profile-menu>
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
                <span class="qs-label text-qs-muted">{{ visibleMyGames().length === myGames().length ? myGames().length : visibleMyGames().length + ' of ' + myGames().length }} {{ myGames().length === 1 ? 'game' : 'games' }}</span>
              }
            </div>

            @if (!isLoadingGames() && myGames().length >= 6) {
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <input type="search" [value]="gameSearch()" (input)="gameSearch.set($any($event.target).value)" placeholder="Search by name or team" aria-label="Search your boards" class="qs-input min-h-9 min-w-0 flex-1 basis-full py-0 sm:basis-48" />
                <div class="hidden flex-wrap gap-1.5 sm:flex" role="group" aria-label="Filter boards">
                  @for (f of statusFilters; track f.value) {
                    <button type="button" class="qs-tab min-h-11 px-3" [attr.aria-pressed]="gameStatus() === f.value" (click)="gameStatus.set(f.value)">{{ f.label }}</button>
                  }
                </div>
                <div class="grid basis-full grid-cols-2 gap-2 sm:hidden">
                  <app-dropdown [fill]="true" [options]="statusFilters" [value]="gameStatus()" (valueChange)="gameStatus.set($any($event))" prefix="Show: " ariaLabel="Filter boards"></app-dropdown>
                  <app-dropdown [fill]="true" [options]="sortOptions" [value]="gameSort()" (valueChange)="gameSort.set($any($event))" prefix="Sort: " ariaLabel="Sort boards"></app-dropdown>
                </div>
                <div class="ml-auto hidden items-center sm:flex">
                  <app-dropdown [options]="sortOptions" [value]="gameSort()" (valueChange)="gameSort.set($any($event))" prefix="Sort: " ariaLabel="Sort boards"></app-dropdown>
                </div>
              </div>
            }

            @if (isLoadingGames()) {
              <div class="qs-skel-delay mt-6 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                @for (i of [0, 1, 2]; track i) {
                  <article class="qs-card flex min-h-[72px] items-center gap-3 p-3" aria-hidden="true">
                    <div class="qs-skel h-12 w-12 shrink-0"></div>
                    <div class="flex-1 space-y-2">
                      <div class="qs-skel h-4 w-2/5"></div>
                      <div class="qs-skel h-3 w-3/5"></div>
                    </div>
                  </article>
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
                <!-- Grouped by what the host does next: lock it, keep sharing it, or nothing -->
                @for (group of boardGroups(); track group.key) {
                  <div class="mt-6" role="group" [attr.aria-label]="group.label">
                    <div class="flex items-baseline justify-between border-b border-qs-line px-0.5 pb-2">
                      <h4 class="qs-eyebrow qs-eyebrow-bar">{{ group.label }}</h4>
                      <span class="qs-label text-qs-muted">{{ group.games.length }}</span>
                    </div>
                    <div class="mt-3 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      @for (game of group.games; track game.id) {
                        <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: false }"></ng-container>
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
              <span class="qs-label text-qs-muted">{{ joinedGames().length }} {{ joinedGames().length === 1 ? 'game' : 'games' }}</span>
            </div>
            <div class="mt-5 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              @for (game of joinedGames(); track game.id) {
                <ng-container *ngTemplateOutlet="gameCard; context: { $implicit: game, joined: true }"></ng-container>
              }
            </div>
          </section>
        }
      </main>

      <ng-template #gameCard let-game let-joined="joined">
        <article animate.enter="qs-fade-rise" class="qs-card min-w-0 overflow-hidden transition-[border-color] duration-150 ease-out has-[a:hover]:border-qs-ink">
          <div class="flex items-center">
            <a
              [routerLink]="['/game', game.id]"
              [state]="{ boardSize: game.boardSize }"
              class="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-2 transition-colors duration-150 hover:bg-qs-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-qs-accent"
              [attr.aria-label]="'Open ' + game.name"
            >
              <div [class]="'qs-mini grid w-12 shrink-0 gap-px rounded-[3px] bg-qs-line p-px ' + getMiniGridClass(game.boardSize)" aria-hidden="true">
                @for (i of getBoardCells(game.boardSize); track i) {
                  <span class="aspect-square" [class]="isBoardQuiet(game) || i < game.squaresFilled ? 'qs-mini-claimed' : 'qs-mini-open'"></span>
                }
              </div>
              <div class="min-w-0">
                <h5 class="truncate text-base font-semibold leading-tight tracking-tight text-qs-ink">{{ game.name }}</h5>
                <p class="mt-0.5 truncate text-sm text-qs-muted">{{ matchup(game) }}</p>
              </div>
            </a>
            <app-card-menu
              class="shrink-0 pr-1"
              [items]="joined ? joinedMenu : hostMenu"
              [label]="'More actions for ' + game.name"
              (picked)="onCardMenu(game, $event)"></app-card-menu>
          </div>
          @if (isBoardFilling(game)) {
            <div class="flex items-center border-t border-qs-line px-1">
              <button type="button" (click)="shareGame(game.id)" class="qs-btn qs-btn-ghost min-h-11 gap-2 px-2.5 font-mono text-xs uppercase tracking-[0.1em] text-qs-muted hover:text-qs-ink" [attr.aria-label]="'Share ' + game.name">
                <ng-icon name="heroShare" class="text-base" aria-hidden="true"></ng-icon>
                Share
              </button>
            </div>
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
    /* Mini board on each card: open squares carry the one accent, claimed squares are neutral */
    .qs-mini-open { background: color-mix(in srgb, var(--qs-accent) 38%, var(--qs-panel)); }
    .qs-mini-claimed { background: color-mix(in srgb, var(--qs-line-strong) 40%, var(--qs-panel)); }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private espnService = inject(EspnService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmService = inject(ConfirmService);
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
    { value: 'locked', label: 'Locked' },
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'Public' }
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
      .filter(g => status === 'all' || (status === 'public' ? !!g.showInOpenBoards : status === 'private' ? !g.showInOpenBoards : (status === 'locked') === g.isLocked))
      .filter(g => !query || [g.name, g.homeTeam, g.awayTeam, g.id].some(v => (v || '').toLowerCase().includes(query)))
      .sort(sorts[this.gameSort()]);
  });
  /** Hosted boards grouped by what the host does next. Empty groups are left out. */
  boardGroups = computed(() => groupBoards(this.visibleMyGames()));
  joinedGames = signal<GameListItem[]>([]);

  /** Get cells array for mini board preview based on board size */
  getBoardCells(size: BoardSize): number[] {
    return miniGridCells(size);
  }

  /** True while a board is unlocked and still has open squares, so Share is worth offering. */
  isBoardFilling(game: GameListItem): boolean {
    return boardIsFilling(game);
  }

  /** Full or locked boards need nothing sold, so their mini board shows all grey. */
  isBoardQuiet(game: GameListItem): boolean {
    return game.isLocked || isBoardFull(game);
  }

  /** The card's one line: the teams playing. */
  matchup(game: GameListItem): string {
    return game.homeTeam && game.awayTeam ? `${game.awayTeam} vs ${game.homeTeam}` : 'Teams not set';
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

  ngOnInit(): void {
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
    await this.authService.signOut();
    this.router.navigate(['/']);
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
}
