import { Component, DestroyRef, ElementRef, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, inject, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroClipboard, heroCheck, heroShare } from '@ng-icons/heroicons/outline';
import { ModalComponent } from '../modal/modal.component';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';
import { browserShareEnv, copyText, shareInvite } from './share-invite.utils';
import { browserWinnersEnv, shareButtonLabel, shareWinners as sharePicture, winnersFileName } from './share-winners.utils';

type CopyTarget = 'code' | 'image' | 'link' | 'tv';

/**
 * Share popup: one Share invite button (share sheet on phones, copy on desktop), the game code and the TV link. On a finished
 * game the heading and button read Share winners, and the button shares the winners picture instead. Used by the dashboard and game page.
 */
@Component({
  selector: 'app-share-dialog',
  imports: [NgIconComponent, ModalComponent],
  providers: [provideIcons({ heroXMark, heroClipboard, heroCheck, heroShare })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-modal [open]="isOpen" labelledBy="share-title" extraClass="overflow-hidden" (dismissed)="close()">
      <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-5 pt-6">
        <div>
          @if (winnersImage) {
            <h3 id="share-title" class="qs-title text-3xl">Share <span class="text-qs-accent">winners</span></h3>
          } @else {
            <p class="qs-eyebrow">Invite players</p>
            <h3 id="share-title" class="qs-title mt-2 text-3xl">Share <span class="text-qs-accent">game</span></h3>
          }
        </div>
        <button type="button" (click)="close()" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
          <ng-icon name="heroXMark" class="text-xl"></ng-icon>
        </button>
      </div>

      <div class="space-y-5 px-6 py-6">
        <button type="button" (click)="winnersImage ? shareWinners() : shareLink()" class="qs-btn qs-btn-primary w-full">
          <ng-icon [name]="shareCopied ? 'heroCheck' : 'heroShare'" [class.icon-pop]="shareCopied" class="text-base"></ng-icon>
          {{ shareLabel }}
        </button>

        <div>
          <p class="qs-label mb-1.5 text-qs-muted">Game code</p>
          <div class="flex items-stretch gap-2">
            <code translate="no" id="share-code" class="flex flex-1 items-center justify-center rounded-btn border border-qs-line bg-qs-panel-2 py-3 font-mono text-2xl font-semibold tracking-[0.3em] text-qs-ink">{{ gameId }}</code>
            <button type="button" (click)="copy(gameId, 'code')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy game code">
              <ng-icon [name]="copied() === 'code' ? 'heroCheck' : 'heroClipboard'" [class.icon-pop]="copied() === 'code'" class="text-base"></ng-icon>
              {{ copied() === 'code' ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <p class="mt-1.5 text-xs text-qs-muted">Players enter this on the dashboard to join.</p>
        </div>

        <details class="rounded-inner border border-qs-line">
          <summary class="qs-label flex min-h-11 cursor-pointer items-center px-4 text-qs-ink">TV link</summary>
          <div class="border-t border-qs-line p-4">
            <div class="flex items-stretch gap-2">
              <input id="share-tv-link" type="text" [value]="tvLink" readonly aria-label="TV link" class="qs-input min-w-0 flex-1 truncate text-sm text-qs-muted" (focus)="$any($event.target).select()" />
              <button type="button" (click)="copy(tvLink, 'tv')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy TV link">
                <ng-icon [name]="copied() === 'tv' ? 'heroCheck' : 'heroClipboard'" [class.icon-pop]="copied() === 'tv'" class="text-base"></ng-icon>
                {{ copied() === 'tv' ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <p class="mt-1.5 text-xs text-qs-muted">Show the live board on any screen. No sign-in.</p>
          </div>
        </details>
        <p class="sr-only" aria-live="polite">{{ copied() ? 'Copied to clipboard' : '' }}</p>
      </div>

      <div class="flex justify-end border-t border-qs-line px-6 py-4">
        <button type="button" (click)="close()" class="qs-btn qs-btn-secondary min-w-28">Done</button>
      </div>
    </app-modal>
  `
})
export class ShareDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() gameId = '';
  /** Finished games only: draws the winners picture. The page passes the same function each time, so the picture is drawn once per open. */
  @Input() winnersImage: (() => Promise<Blob>) | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly gameService = inject(GameService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toast = inject(ToastService);
  private resetTimer: ReturnType<typeof setTimeout> | undefined;
  private picture: Promise<Blob> | null = null;
  private pictureReady: Blob | null = null;

  copied = signal<CopyTarget | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.resetTimer));
  }

  get link(): string {
    return this.gameService.getShareableLink(this.gameId);
  }

  get tvLink(): string {
    return this.gameService.getTvLink(this.gameId);
  }

  protected get shareCopied(): boolean {
    return this.copied() === (this.winnersImage ? 'image' : 'link');
  }

  protected get shareLabel(): string {
    return shareButtonLabel(!!this.winnersImage, this.shareCopied);
  }

  close(): void {
    this.copied.set(null);
    this.closed.emit();
  }

  async copy(text: string, which: 'code' | 'tv'): Promise<void> {
    if (await copyText(text, browserShareEnv())) {
      this.flashCopied(which);
      return;
    }
    this.selectForManualCopy(which === 'code' ? '#share-code' : '#share-tv-link');
  }

  /** Starts drawing the winners picture as the dialog opens, so a phone's share sheet can open straight from the tap. */
  ngOnChanges(): void {
    if (this.isOpen && this.winnersImage) {
      if (!this.picture) this.drawPicture();
      return;
    }
    this.picture = null;
    this.pictureReady = null;
  }

  async shareLink(): Promise<void> {
    const result = await shareInvite(this.link, browserShareEnv());
    if (result === 'copied') this.flashCopied('link');
    if (result === 'failed') this.toast.error(`Couldn't copy. The link is ${this.link}`);
  }

  /** No await before sharePicture: on desktop the clipboard write has to start inside the tap. */
  async shareWinners(): Promise<void> {
    const image = this.picture ?? this.drawPicture();
    const result = await sharePicture({ image, ready: this.pictureReady, fileName: winnersFileName(this.gameId) }, browserWinnersEnv());
    if (result === 'copied') this.flashCopied('image');
    if (result === 'failed') this.toast.error("Couldn't make the winners picture. Try again.");
  }

  private drawPicture(): Promise<Blob> {
    const image = this.winnersImage ? this.winnersImage() : Promise.reject(new Error('Not a finished game'));
    this.picture = image;
    this.pictureReady = null;
    // A failed draw is reported when Share winners is tapped; clearing it here lets that tap draw again.
    image.then(
      blob => { if (this.picture === image) this.pictureReady = blob; },
      () => { if (this.picture === image) this.picture = null; }
    );
    return image;
  }

  private flashCopied(which: CopyTarget): void {
    clearTimeout(this.resetTimer);
    this.copied.set(which);
    this.resetTimer = setTimeout(() => this.copied.set(null), 2000);
  }

  private selectForManualCopy(selector: string): void {
    const el = this.host.nativeElement.querySelector<HTMLElement>(selector);
    if (el instanceof HTMLInputElement) {
      el.select();
      return;
    }
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }
}
