import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBars3,
  heroLockClosed,
  heroLockOpen,
  heroMagnifyingGlass,
  heroShare,
  heroSquares2x2,
  heroTicket,
  heroXMark
} from '@ng-icons/heroicons/outline';

import { SiteHeaderComponent } from '../../components/ui/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { ModalComponent } from '../../components/ui/modal/modal.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { SeasonPassesDialogComponent } from '../../components/ui/season-passes-dialog/season-passes-dialog.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { AuthService } from '../../core/services/auth.service';
import { PlanService } from '../../core/services/plan.service';
import { WalkthroughService } from '../../core/services/walkthrough.service';
import { DockAtEndDirective } from '../../shared/directives/dock-at-end.directive';
import { CreateGameFormComponent } from '../create/create-game-form.component';
import { EditGameDialogComponent } from '../super-bowl-squares/components/edit-game-dialog/edit-game-dialog.component';
import { DashboardDeskBarComponent } from './components/dashboard-desk-bar/dashboard-desk-bar.component';
import { DashboardHostingComponent } from './components/dashboard-hosting/dashboard-hosting.component';
import { DashboardJoinedComponent } from './components/dashboard-joined/dashboard-joined.component';
import { DashboardPhoneBarComponent } from './components/dashboard-phone-bar/dashboard-phone-bar.component';
import { CodeFieldComponent } from './components/dashboard-returning-empty/code-field.component';
import { NewBoardDockComponent } from './components/dashboard-returning-empty/new-board-dock.component';
import { SeasonTilesComponent } from './components/dashboard-returning-empty/season-tiles.component';
import { FirstHostTitleComponent } from './components/dashboard-first-board/first-host-title.component';
import { FreeGamesLineComponent } from './components/dashboard-first-board/free-games-line.component';
import { SampleGameComponent } from './components/dashboard-first-board/sample-game.component';
import { UpgradePassDialogComponent } from './components/upgrade-pass-dialog/upgrade-pass-dialog.component';
import { DashboardDialogsService } from './services/dashboard-dialogs.service';
import { DashboardEditService } from './services/dashboard-edit.service';
import { DashboardGroupsService } from './services/dashboard-groups.service';
import { DashboardSearchService } from './services/dashboard-search.service';
import { DASHBOARD_TOUR_STEPS, dashboardTourSteps } from './services/dashboard-tour';
import { DashboardViewService } from './services/dashboard-view.service';
import { DashboardStore } from './services/dashboard.store';
import { PlayersViewService } from './services/players-view.service';

/**
 * Your games: the boards you host and joined, the search-or-code field, and the create, edit, share and upgrade dialogs.
 * The page only shows state and forwards events: the state and its logic live in the services under ./services,
 * provided here so they live and die with the page.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    ModalComponent, NgIconComponent, SiteHeaderComponent, SiteFooterComponent, DockAtEndDirective, ProfileMenuComponent, ShareDialogComponent,
    CreateGameFormComponent, EditGameDialogComponent, UpgradePassDialogComponent, SeasonPassesDialogComponent, DashboardHostingComponent,
    DashboardJoinedComponent, DashboardPhoneBarComponent, CodeFieldComponent, DashboardDeskBarComponent,
    NewBoardDockComponent, SeasonTilesComponent, FirstHostTitleComponent, FreeGamesLineComponent, SampleGameComponent
  ],
  providers: [
    DashboardStore,
    DashboardGroupsService,
    DashboardSearchService,
    DashboardViewService,
    DashboardEditService,
    DashboardDialogsService,
    PlayersViewService,
    provideIcons({
      heroBars3,
      heroLockClosed,
      heroLockOpen,
      heroMagnifyingGlass,
      heroShare,
      heroSquares2x2,
      heroTicket,
      heroXMark
    })
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardComponent implements OnInit, OnDestroy {
  constructor() {
    // Lock body scroll when any modal is open
    effect(() => {
      const anyModalOpen = this.dialogs.anyModalOpen();
      if (typeof document !== 'undefined') {
        document.body.style.overflow = anyModalOpen ? 'hidden' : '';
      }
    });
  }

  public ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.classList.remove('has-phone-bar');
  }

  public ngOnInit(): void {
    // Lifts toasts above the phone bottom bar
    if (typeof document !== 'undefined') document.body.classList.add('has-phone-bar');
    this.store.loadMyGames();
    this.dialogs.loadAutoManageDefault();
    const params = this.route.snapshot.queryParamMap;
    this.search.showMissingGame(params);
    this.dialogs.resumeCreateIntent(params);
  }

  public async signOut(): Promise<void> {
    if (await this.authService.signOut()) this.router.navigate(['/']);
  }

  public startWalkthrough(): void {
    // The tour points at the search-or-code field and New board, which the open search covers on a phone
    if (this.search.searchOpen()) this.search.closeSearch();
    this.walkthroughService.resetCompletion('dashboard');
    const phone = window.innerWidth < 640;
    this.walkthroughService.start('dashboard', dashboardTourSteps(DASHBOARD_TOUR_STEPS,
      { phone, host: this.store.canCreateGame(), noBoards: this.store.emptyHost(), newBoardLabel: this.store.newBoardLabel() }));
  }

  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly edit: DashboardEditService = inject(DashboardEditService);
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly planService: PlanService = inject(PlanService);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
  protected readonly view: DashboardViewService = inject(DashboardViewService);

  private readonly authService: AuthService = inject(AuthService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly walkthroughService: WalkthroughService = inject(WalkthroughService);
}
