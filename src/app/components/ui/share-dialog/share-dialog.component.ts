import { Component, ElementRef, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroClipboard, heroCheck, heroShare } from '@ng-icons/heroicons/outline';
import { ModalComponent } from '../modal/modal.component';
import { GameService } from '../../../core/services/game.service';

/** Share popup: game code and link, each with a copy button. Used by the dashboard and game page. */
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
        @if (canShare) {
          <button type="button" (click)="share()" class="qs-btn qs-btn-primary w-full">
            <ng-icon name="heroShare" class="text-base"></ng-icon>
            Share link
          </button>
        }

        <div>
          <label for="share-link" class="qs-label mb-1.5 block text-qs-muted">Link</label>
          <div class="flex items-stretch gap-2">
            <input id="share-link" type="text" [value]="link" readonly class="qs-input min-w-0 flex-1 truncate text-sm text-qs-muted" (focus)="$any($event.target).select()" />
            <button type="button" (click)="copy(link, 'link')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy share link">
              <ng-icon [name]="copied() === 'link' ? 'heroCheck' : 'heroClipboard'" [class.icon-pop]="copied() === 'link'" class="text-base"></ng-icon>
              {{ copied() === 'link' ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>

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

  copied = signal<'code' | 'link' | 'tv' | null>(null);

  get canShare(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
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

  async share(): Promise<void> {
    try {
      await navigator.share({ title: 'QuarterScore squares', text: 'Pick your squares', url: this.link });
    } catch {}
  }

  async copy(text: string, which: 'code' | 'link' | 'tv'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(which);
      setTimeout(() => this.copied.set(null), 2000);
    } catch {
      const el = this.host.nativeElement.querySelector<HTMLElement>(which === 'code' ? '#share-code' : which === 'link' ? '#share-link' : '#share-tv-link');
      if (el instanceof HTMLInputElement) el.select();
      else if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }
}
