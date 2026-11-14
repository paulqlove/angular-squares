import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ParamMap, Router } from '@angular/router';

import { GameService } from '../../../core/services/game.service';
import { codeErrorShows, confirmedCodeMatch, gameCodeFrom } from './dashboard-filters';

export type SearchWhere = 'phone' | 'desk';

/**
 * The dashboard's one field that searches the boards you host and joins a game by its code.
 * Provided on the dashboard, so it lives and dies with the page.
 */
@Injectable()
export class DashboardSearchService {
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
    // Once the text could be a game code, ask the server whether that game exists, a moment after typing stops
    effect(onCleanup => {
      const code = this.codeCandidate();
      if (!code) return;
      let live = true;
      const timer = setTimeout(() => {
        this.gameService.gameExists(code)
          .then(found => { if (live && found) this.confirmedCode.set(code); })
          .catch(() => undefined);
      }, 250);
      onCleanup(() => {
        live = false;
        clearTimeout(timer);
      });
    });
  }

  /** The text as a game code: six letters or digits, upper-cased. Null when it can't be one. */
  public readonly codeCandidate = computed<string | null>(() => gameCodeFrom(this.gameSearch()));
  /** The game code the server confirmed for the current text. Join shows inside the field while it's set. */
  public readonly codeMatch = computed<string | null>(() => confirmedCodeMatch(this.codeCandidate(), this.confirmedCode()));
  /** The text in the search-or-code field. */
  public readonly gameSearch = signal<string>('');
  /** Phone: how far the keyboard covers the bottom of the screen, so the open search rides above it. */
  public readonly keyboardLift = signal<number>(0);
  /** Phone: the bottom bar shows the search field and Cancel in place of Join and New board. */
  public readonly searchOpen = signal<boolean>(false);
  /** "Game not found" shows for the code in the field after Enter, or after a broken game link, until the text changes. */
  public readonly showCodeError = computed<boolean>(() => codeErrorShows(this.codeNotFound(), this.codeCandidate()));

  public clearSearch(where?: SearchWhere): void {
    this.gameSearch.set('');
    this.codeNotFound.set(null);
    if (where) this.searchInput(where)?.focus();
  }

  public closeSearch(): void {
    this.gameSearch.set('');
    this.codeNotFound.set(null);
    this.searchOpen.set(false);
    this.searchInput('phone')?.blur();
  }

  public joinGame(code: string | null = this.codeMatch()): void {
    if (code) this.router.navigate(['/game', code]);
  }

  /** Enter joins when the text is a real game code, checking with the server first if the check hasn't come back yet. */
  public async onSearchEnter(event: Event): Promise<void> {
    const code = this.codeCandidate();
    const found = !!code && (this.codeMatch() === code || await this.gameService.gameExists(code).catch(() => false));
    if (found) {
      this.joinGame(code);
      return;
    }
    if (code && code === this.codeCandidate()) this.codeNotFound.set(code);
    (event.target as HTMLInputElement).blur();
  }

  public onSearchEscape(where: SearchWhere): void {
    if (where === 'phone') this.closeSearch();
    else this.clearSearch();
  }

  public onSearchInput(value: string): void {
    this.gameSearch.set(value);
    this.codeNotFound.set(null);
  }

  public openSearch(): void {
    this.searchOpen.set(true);
    // Focus inside the tap itself so iOS raises the keyboard; the field is already in the bar, only faded out
    this.searchInput('phone')?.focus({ preventScroll: true });
  }

  /** A broken game link: the game page sent them here with its code, to show "Game not found" in the search field. */
  public showMissingGame(params: ParamMap): void {
    const missingCode = params.get('missing') ? gameCodeFrom(params.get('join') ?? '') : null;
    if (!missingCode) return;
    this.gameSearch.set(missingCode);
    this.codeNotFound.set(missingCode);
    if (typeof window !== 'undefined' && window.innerWidth < 640) this.searchOpen.set(true);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  /** The code Enter, or a broken game link, found no game for. */
  private readonly codeNotFound = signal<string | null>(null);
  /** The last code the server said is a real game. */
  private readonly confirmedCode = signal<string | null>(null);
  private readonly gameService: GameService = inject(GameService);
  private readonly router: Router = inject(Router);

  private searchInput(where: SearchWhere): HTMLInputElement | null {
    return typeof document !== 'undefined' ? document.querySelector<HTMLInputElement>(`input[data-search="${where}"]`) : null;
  }
}
