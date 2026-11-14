import { afterNextRender, ElementRef, inject, Injectable, Injector, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BoardSize } from '../../../core/services/game.service';
import { WalkthroughService } from '../../../core/services/walkthrough.service';
import { walkthroughStepsFor } from '../utils/game-walkthrough';
import { squareForScore } from '../utils/board-math';
import type { PaymentDialogComponent } from '../components/payment-dialog/payment-dialog.component';
import { GameStateService } from './game-state.service';

type GameTab = 'board' | 'probabilities' | 'boxscore' | 'more';

/** The game page's view state: tabs, highlights, which dialog is open, the host note's fold and the skeleton. */
@Injectable()
export class GamePageUiService {
  // Public properties

  public activeTab: GameTab = 'board';
  public alertMessage: string = '';
  /** The page's main element, for the slide after an arrow-key board switch. Set by the page. */
  public boardPage: ElementRef<HTMLElement> | undefined;
  public highlightedSquare: string | null = null;
  /** Whether the host note's row is cut short, so More shows. */
  public readonly hostNoteClamped: WritableSignal<boolean> = signal(false);
  /** The host note paragraph, set by the info bar while it shows a note. */
  public hostNoteEl: ElementRef<HTMLElement> | undefined;
  /** Whether the host note is opened in full. */
  public readonly hostNoteOpen: WritableSignal<boolean> = signal(false);
  /** Below the lg breakpoint the list starts folded so Winners is not pushed far down the page. */
  public isPlayersListVisible: boolean = !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023px)').matches);
  /** Manage players; an imperative dialog, set by the page. */
  public paymentDialog: PaymentDialogComponent | undefined;
  /** The square a signed-out visitor tapped, claimed once they sign in. */
  public pendingSquare: { row: number; col: number } | null = null;
  public selectedPlayer: string | null = null;
  public showAlert: boolean = false;
  public readonly showAuthModal: WritableSignal<boolean> = signal(false);
  public readonly showForceNameChangeModal: WritableSignal<boolean> = signal(false);
  public readonly showNameEditModal: WritableSignal<boolean> = signal(false);
  public readonly showSettings: WritableSignal<boolean> = signal(false);
  public readonly showShareModal: WritableSignal<boolean> = signal(false);
  public readonly showShrinkSuggestion: WritableSignal<boolean> = signal(false);
  public readonly skeletonFade: WritableSignal<boolean> = signal(false);
  public readonly skeletonSize: WritableSignal<BoardSize> = signal<BoardSize>(100);
  /** The side the next board slides in from after an arrow-key switch; cleared once it has. */
  public slideFrom: 'left' | 'right' | '' = '';
  public takenByPlayer: string = '';
  /** True once the viewer has picked a tab, so switching fades the content in but the first paint does not. */
  public tabTouched: boolean = false;

  // Public functions

  /** Shows the alert under the board for three seconds. */
  public flashAlert(message: string): void {
    this.showAlert = true;
    this.alertMessage = message;
    setTimeout(() => {
      this.showAlert = false;
    }, 3000);
  }

  /** After the note renders, checks whether it runs past its one line. Opened, it keeps More's answer from before. */
  public measureHostNote(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    afterNextRender({
      read: () => {
        const el = this.hostNoteEl?.nativeElement;
        if (!el) return this.hostNoteClamped.set(false);
        if (this.hostNoteOpen()) return;
        this.hostNoteClamped.set(el.scrollHeight > el.clientHeight + 1);
      }
    }, { injector: this.injector });
  }

  /** The skeleton matches the board's size when this browser knows it (from the link or the last visit). */
  public pickSkeletonSize(gameId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const valid = (v: unknown): v is BoardSize => v === 25 || v === 50 || v === 100;
    let size: unknown = history.state?.boardSize;
    if (!valid(size)) {
      try {
        size = Number(localStorage.getItem(`qs_size_${gameId}`));
      } catch {
        size = null;
      }
    }
    this.skeletonFade.set(!valid(size));
    this.skeletonSize.set(valid(size) ? size : 100);
  }

  /** A new note, or another board's, starts on its one line. */
  public resetHostNote(): void {
    this.hostNoteOpen.set(false);
    this.measureHostNote();
  }

  public selectTab(tab: GameTab): void {
    this.activeTab = tab;
    this.tabTouched = true;
  }

  /** After an arrow-key switch, the new board eases in 12px from the side the arrow points to. Transform only, no fade,
   *  so nothing ever goes blank. Web Animations with no fill, so no transform lingers to trap fixed dialogs inside. */
  public slideInBoard(): void {
    const from = this.slideFrom;
    this.slideFrom = '';
    if (!from || !isPlatformBrowser(this.platformId) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    requestAnimationFrame(() => this.boardPage?.nativeElement.animate(
      [{ transform: `translateX(${from === 'right' ? 12 : -12}px)` }, { transform: 'none' }],
      { duration: 180, easing: 'cubic-bezier(.2,0,0,1)' }
    ));
  }

  public startWalkthrough(): void {
    this.walkthroughService.resetCompletion('gameboard');
    this.walkthroughService.start('gameboard', walkthroughStepsFor(this.state.isHost()));
  }

  public toggleHostNote(): void {
    this.hostNoteOpen.update(open => !open);
  }

  public togglePlayersList(): void {
    this.isPlayersListVisible = !this.isPlayersListVisible;
  }

  /** A Winners tile highlights the square its score points to; a second tap clears it. */
  public toggleQuarterHighlight(quarter: string): void {
    const score = this.state.scores[quarter as keyof typeof this.state.scores];
    if (!score) return;
    const key = squareForScore(this.state.board, score);
    if (!key) return;
    this.highlightedSquare = this.highlightedSquare === key ? null : key;
  }

  // Private properties

  private readonly injector: Injector = inject(Injector);
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly walkthroughService: WalkthroughService = inject(WalkthroughService);
}
