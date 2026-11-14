import { ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroShare } from '@ng-icons/heroicons/outline';
import { AdSlotComponent } from '../../components/ui/ad-slot/ad-slot.component';
import { SiteHeaderComponent } from '../../components/ui/site-header/site-header.component';
import { HelpMenuComponent } from '../../components/ui/help-menu/help-menu.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { YourGamesMenuComponent } from '../../components/ui/your-games-menu/your-games-menu.component';
import { DockAtEndDirective } from '../../shared/directives/dock-at-end.directive';
import { BoardSectionComponent } from './components/board-section/board-section.component';
import { BoardSettingsDialogsComponent } from './components/board-settings-dialogs/board-settings-dialogs.component';
import { GameInfoBarComponent } from './components/game-info-bar/game-info-bar.component';
import { GamePageDialogsComponent } from './components/game-page-dialogs/game-page-dialogs.component';
import { GameSkeletonComponent } from './components/game-skeleton/game-skeleton.component';
import { HostToolbarComponent } from './components/host-toolbar/host-toolbar.component';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { PlayersSectionComponent } from './components/players-section/players-section.component';
import { WinnersAndPayoutsComponent } from './components/winners-and-payouts/winners-and-payouts.component';
import { EspnSyncService } from './services/espn-sync.service';
import { GamePageUiService } from './services/game-page-ui.service';
import { GamePlayersService } from './services/game-players.service';
import { GameScoringService } from './services/game-scoring.service';
import { GameSessionService } from './services/game-session.service';
import { GameStateService } from './services/game-state.service';
import { HostActionsService } from './services/host-actions.service';
import { NumberDrawService } from './services/number-draw.service';
import { PlayerNameService } from './services/player-name.service';
import { SquarePickerService } from './services/square-picker.service';

/**
 * The game page. It lays the page out and wires the browser's events to the page services; the board's state lives in
 * GameStateService and the work in the services next to it, all provided here so each page gets its own.
 */
@Component({
  selector: 'app-super-bowl-squares',
  imports: [
    AdSlotComponent,
    SiteHeaderComponent,
    BoardSectionComponent,
    BoardSettingsDialogsComponent,
    DockAtEndDirective,
    GameInfoBarComponent,
    GamePageDialogsComponent,
    GameSkeletonComponent,
    HelpMenuComponent,
    HostToolbarComponent,
    NgIconComponent,
    PaymentDialogComponent,
    PlayersSectionComponent,
    ProfileMenuComponent,
    WinnersAndPayoutsComponent,
    YourGamesMenuComponent
  ],
  providers: [
    provideIcons({ heroShare }),
    EspnSyncService,
    GamePageUiService,
    GamePlayersService,
    GameScoringService,
    GameSessionService,
    GameStateService,
    HostActionsService,
    NumberDrawService,
    PlayerNameService,
    SquarePickerService
  ],
  templateUrl: './super-bowl-squares.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./super-bowl-squares.component.scss']
})
export class SuperBowlSquaresComponent implements OnInit, OnDestroy {
  // Constructor

  constructor() {
    this.ui.pickSkeletonSize(inject(ActivatedRoute).snapshot.params['gameId'] ?? '');
    // Lift toasts and the preview switcher above the floating host bar
    effect(() => {
      const hasHostBar = this.state.isHost();
      if (typeof document !== 'undefined') document.body.classList.toggle('has-host-bar', hasHostBar);
    });
    // Reactively update the player's name when auth state changes (e.g., Google sign-in after page load)
    effect(() => this.names.syncWithAuth());
  }

  // Public functions

  public ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.classList.remove('has-host-bar');
    this.session.destroy();
  }

  public ngOnInit(): void {
    void this.session.bindRoute();
  }

  @HostListener('document:keydown', ['$event'])
  public onArrowKey(event: KeyboardEvent): void {
    this.session.onArrowKey(event);
  }

  @HostListener('document:click')
  public onDocumentClick(): void {
    this.ui.highlightedSquare = null;
  }

  @HostListener('window:resize')
  public onResize(): void {
    this.ui.measureHostNote();
  }

  // Protected properties

  @ViewChild('boardPage')
  protected set boardPage(el: ElementRef<HTMLElement> | undefined) {
    this.ui.boardPage = el;
  }

  protected readonly names: PlayerNameService = inject(PlayerNameService);
  /** Manage players; the services open and refresh it. */
  @ViewChild('paymentDialog')
  protected set paymentDialog(dialog: PaymentDialogComponent | undefined) {
    this.ui.paymentDialog = dialog;
  }

  protected readonly players: GamePlayersService = inject(GamePlayersService);
  /** The board's state. Read by the template and by dev tools (`ng.getComponent(...).state`). */
  protected readonly state: GameStateService = inject(GameStateService);
  protected readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private properties

  private readonly session: GameSessionService = inject(GameSessionService);
}
