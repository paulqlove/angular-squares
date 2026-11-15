import { Component, DestroyRef, ElementRef, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroClipboard, heroCheck, heroShare } from '@ng-icons/heroicons/outline';
import { ModalComponent } from '../modal/modal.component';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';
import { browserShareEnv, copyText, shareInvite } from './share-invite.utils';

type CopyTarget = 'code' | 'link' | 'tv';

/** Share popup: one Share invite button (share sheet on phones, copy on desktop), the game code and the TV link. Used by the dashboard and game page. */
@Component({
  selector: 'app-share-dialog',
  imports: [NgIconComponent, ModalComponent],
  providers: [provideIcons({ heroXMark, heroClipboard, heroCheck, heroShare })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-modal [open]="isOpen" labelledBy="share-title" extraClass="overflow-hidden" (dismissed)="close()">
      <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-5 pt-6">
        <div>
          <p class="qs-eyebrow">Invite players</p>
          <h3 id="share-title" class="qs-title mt-2 text-3xl">Share <span class="text-qs-accent">game</span></h3>
        </div>
        <button type="button" (click)="close()" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
          <ng-icon name="heroXMark" class="text-xl"></ng-icon>
        </button>
      </div>

      <div class="space-y-5 px-6 py-6">
        <button type="button" (click)="shareLink()" class="qs-btn qs-btn-primary w-full">
          <ng-icon [name]="copied() === 'link' ? 'heroCheck' : 'heroShare'" [class.icon-pop]="copied() === 'link'" class="text-base"></ng-icon>
          {{ copied() === 'link' ? 'Link copied' : 'Share invite' }}
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
export class ShareDialogComponent {
  @Input() isOpen = false;
  @Input() gameId = '';
  @Output() closed = new EventEmitter<void>();

  private readonly gameService = inject(GameService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toast = inject(ToastService);
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

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

  async shareLink(): Promise<void> {
    const result = await shareInvite(this.link, browserShareEnv());
    if (result === 'copied') this.flashCopied('link');
    if (result === 'failed') this.toast.error(`Couldn't copy. The link is ${this.link}`);
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
