import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroClipboard, heroCheck } from '@ng-icons/heroicons/outline';

/** Share popup: game code and link, each with a copy button. Used by the dashboard and game page. */
@Component({
  selector: 'app-share-dialog',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroXMark, heroClipboard, heroCheck })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" (click)="close()">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          class="w-full max-w-md overflow-hidden rounded-card border border-qs-line bg-qs-panel shadow-pop"
          (click)="$event.stopPropagation()"
        >
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
            <div>
              <p class="qs-label mb-1.5 text-qs-muted">Game code</p>
              <div class="flex items-stretch gap-2">
                <code class="flex flex-1 items-center justify-center rounded-btn border border-qs-line bg-qs-panel-2 py-3 font-mono text-2xl font-semibold tracking-[0.3em] text-qs-ink">{{ gameId }}</code>
                <button type="button" (click)="copy(gameId, 'code')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy game code">
                  <ng-icon [name]="copied() === 'code' ? 'heroCheck' : 'heroClipboard'" class="text-base"></ng-icon>
                  {{ copied() === 'code' ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <p class="mt-1.5 text-xs text-qs-muted">Players enter this on the dashboard to join.</p>
            </div>

            <div>
              <label for="share-link" class="qs-label mb-1.5 block text-qs-muted">Link</label>
              <div class="flex items-stretch gap-2">
                <input id="share-link" type="text" [value]="link" readonly class="qs-input min-w-0 flex-1 truncate text-sm text-qs-muted" (focus)="$any($event.target).select()" />
                <button type="button" (click)="copy(link, 'link')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy share link">
                  <ng-icon [name]="copied() === 'link' ? 'heroCheck' : 'heroClipboard'" class="text-base"></ng-icon>
                  {{ copied() === 'link' ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </div>
            @if (tvLink) {
              <div>
                <label for="share-tv-link" class="qs-label mb-1.5 block text-qs-muted">TV link</label>
                <div class="flex items-stretch gap-2">
                  <input id="share-tv-link" type="text" [value]="tvLink" readonly class="qs-input min-w-0 flex-1 truncate text-sm text-qs-muted" (focus)="$any($event.target).select()" />
                  <button type="button" (click)="copy(tvLink, 'tv')" class="qs-btn qs-btn-primary min-w-28" aria-label="Copy TV link">
                    <ng-icon [name]="copied() === 'tv' ? 'heroCheck' : 'heroClipboard'" class="text-base"></ng-icon>
                    {{ copied() === 'tv' ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-qs-muted">Open on a TV or any screen to show the live board. No sign-in needed.</p>
              </div>
            }
            <p class="sr-only" aria-live="polite">{{ copied() ? 'Copied to clipboard' : '' }}</p>
          </div>

          <div class="flex justify-end border-t border-qs-line bg-qs-panel-2 px-6 py-4">
            <button type="button" (click)="close()" class="qs-btn qs-btn-secondary min-w-28">Done</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ShareDialogComponent {
  @Input() isOpen = false;
  @Input() gameId = '';
  @Input() link = '';
  @Input() tvLink = '';
  @Output() closed = new EventEmitter<void>();

  copied = signal<'code' | 'link' | 'tv' | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
  }

  close(): void {
    this.copied.set(null);
    this.closed.emit();
  }

  async copy(text: string, which: 'code' | 'link' | 'tv'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(which);
      setTimeout(() => this.copied.set(null), 2000);
    } catch {}
  }
}
