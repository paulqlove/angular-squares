import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HowToVideo } from './howto-videos';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Phone widths, where the vertical Short plays in place. Keep in step with the media query in the styles below. */
const PHONE_QUERY = '(max-width: 639.98px)';

/**
 * A how-to clip that costs nothing until it is tapped: a drawn poster first, then the youtube-nocookie player.
 * On phones the player opens in the same box, as the vertical Short when the clip has one.
 * On wider screens it opens large in a centered window over the page, since the columns are too narrow to watch in.
 * Renders nothing without a valid ID.
 */
@Component({
  selector: 'app-howto-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[class.has-phone]': 'hasPhone()' },
  template: `
    @if (src(); as url) {
      <figure class="not-prose">
        <div class="howto-box relative overflow-hidden rounded-card border border-qs-line bg-qs-canvas">
          @if (playing()) {
            <iframe
              class="absolute inset-0 h-full w-full"
              [src]="playerSrc()"
              [title]="video().title"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"></iframe>
          } @else {
            <button #poster type="button" (click)="play()" class="howto-poster group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus" [attr.aria-label]="'Play video: ' + video().title + ', ' + length()">
              <span class="absolute left-3 top-3 z-10 max-w-[70%] rounded-inner bg-qs-tile px-2.5 py-1.5 text-left text-xs font-semibold leading-snug text-qs-tile-ink sm:left-4 sm:top-4 sm:text-sm">{{ video().caption }}</span>
              <span class="howto-sketch" aria-hidden="true"><span class="howto-sketch-bar"></span></span>
              <span class="absolute flex h-12 w-12 items-center justify-center rounded-full bg-qs-tile text-qs-tile-ink shadow-pop transition-transform duration-[var(--qs-t-fast)] ease-[var(--qs-ease)] group-hover:scale-105 group-active:scale-95 sm:h-14 sm:w-14" aria-hidden="true">
                <svg viewBox="0 0 24 24" class="ml-0.5 h-5 w-5 sm:h-6 sm:w-6" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z"/></svg>
              </span>
              <span class="absolute bottom-3 right-3 rounded-chip bg-qs-tile px-1.5 py-0.5 font-mono text-xs text-qs-tile-ink sm:bottom-4 sm:right-4" aria-hidden="true">{{ length() }}</span>
            </button>
          }
        </div>
        <figcaption class="mt-2 text-[0.9375rem] font-semibold leading-snug text-qs-ink">{{ video().title }}</figcaption>
      </figure>

      @if (expanded()) {
        <dialog #dialog class="howto-dialog" [attr.aria-label]="video().title" (click)="closeOnBackdrop($event)" (close)="onClosed()">
          <div class="mb-3 flex items-center justify-between gap-4">
            <p class="truncate text-base font-semibold text-white">{{ video().title }}</p>
            <button type="button" (click)="close()" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-[var(--qs-t-fast)] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Close video">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
          <div class="relative overflow-hidden rounded-card bg-black" style="aspect-ratio: 1280 / 872">
            <iframe
              class="absolute inset-0 h-full w-full"
              [src]="url"
              [title]="video().title"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        </dialog>
      }
    }
  `,
  styles: `
    :host {
      container-type: inline-size;
    }
    .howto-box {
      aspect-ratio: 1280 / 872;
    }
    /* Phones play the vertical Short, so the box turns tall, capped so it fits on screen with room around it. Same width as PHONE_QUERY. */
    @media (max-width: 639.98px) {
      :host(.has-phone) .howto-box {
        aspect-ratio: 9 / 16;
        width: min(100%, calc(min(64svh, 34rem) * 9 / 16));
      }
      :host(.has-phone) .howto-sketch {
        width: 78%;
      }
    }
    /* A small lift on hover says the clip opens bigger. To grow on hover instead, scale .howto-box here. */
    @media (hover: hover) and (min-width: 640px) {
      .howto-box {
        transition: transform var(--qs-t-state) var(--qs-ease), box-shadow var(--qs-t-state) var(--qs-ease);
      }
      .howto-box:has(.howto-poster:hover) {
        box-shadow: var(--qs-shadow);
      }
    }
    @media (hover: hover) and (min-width: 640px) and (prefers-reduced-motion: no-preference) {
      .howto-box:has(.howto-poster:hover) {
        transform: translateY(-3px);
      }
    }
    .howto-sketch {
      position: relative;
      width: 46%;
      aspect-ratio: 1280 / 872;
      overflow: hidden;
      border-radius: var(--qs-r-inner);
      background-color: var(--qs-panel);
      background-image:
        linear-gradient(var(--qs-line) 1px, transparent 1px),
        linear-gradient(90deg, var(--qs-line) 1px, transparent 1px);
      background-size: 10% 10%;
      background-position: 0 16%;
      box-shadow: var(--qs-shadow);
    }
    /* In a narrow column the board drawing would crowd the caption, so the poster keeps only the caption, play button and length. */
    @container (max-width: 280px) {
      .howto-sketch {
        display: none;
      }
    }
    .howto-sketch-bar {
      position: absolute;
      inset: 0 0 auto 0;
      height: 16%;
      background: var(--qs-tile);
    }
    /* The large player: as wide as the screen allows up to 1100px, and short enough that the title row and player fit in view. */
    .howto-dialog {
      margin: auto;
      padding: 0;
      border: 0;
      background: transparent;
      overflow: visible;
      max-width: none;
      max-height: none;
      width: min(80vw, 1100px, calc((100svh - 8rem) * 1280 / 872));
    }
    .howto-dialog::backdrop {
      background: rgb(0 0 0 / 0.8);
    }
    @media (prefers-reduced-motion: no-preference) {
      .howto-dialog[open] {
        animation: howto-in var(--qs-t-sheet) var(--qs-ease-decel);
      }
      .howto-dialog[open]::backdrop {
        animation: howto-fade var(--qs-t-sheet) var(--qs-ease-decel);
      }
    }
    @keyframes howto-in {
      from { opacity: 0; transform: scale(0.96); }
    }
    @keyframes howto-fade {
      from { opacity: 0; }
    }
  `
})
export class HowToVideoComponent {
  /** True while the large player is open over the page. */
  public readonly expanded = signal(false);

  /** True when the clip has a valid vertical Short for phones. */
  public readonly hasPhone = computed(() => YOUTUBE_ID.test(this.video().phoneYoutubeId ?? ''));

  /** The clip's length as m:ss. */
  public readonly length = computed(() => {
    const total = this.video().seconds;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });

  /** The in-place player's address: the Short on a phone when there is one, the desktop clip otherwise. */
  public readonly playerSrc = computed<SafeResourceUrl | null>(() => {
    const video = this.video();
    return this.embed(this.vertical() && this.hasPhone() ? video.phoneYoutubeId! : video.youtubeId);
  });

  /** True once the clip plays in place, which only happens on phones. */
  public readonly playing = signal(false);

  /** The desktop clip's player address, or null when the ID is missing or malformed. */
  public readonly src = computed<SafeResourceUrl | null>(() => this.embed(this.video().youtubeId));

  public readonly video = input.required<HowToVideo>();

  public close(): void {
    const dialog = this.dialog()?.nativeElement;
    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      this.onClosed();
    }
  }

  /** A click on the dark area around the player lands on the dialog itself, so it closes. */
  public closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.close();
    }
  }

  /** Runs however the large player closes (button, Esc or a click outside): stops the video, unlocks the page and puts focus back. */
  public onClosed(): void {
    if (!this.expanded()) {
      return;
    }
    this.expanded.set(false);
    this.document.documentElement.style.overflow = this.savedOverflow;
    this.poster()?.nativeElement.focus();
  }

  public play(): void {
    // Picked at tap time in the browser, so the prerendered poster is the same for everyone.
    const phone = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
    if (phone) {
      this.vertical.set(true);
      this.playing.set(true);
      // The poster button is gone now, so hand focus to the player instead of dropping it on the page.
      afterNextRender(() => this.host.nativeElement.querySelector('iframe')?.focus(), { injector: this.injector });
      return;
    }
    this.savedOverflow = this.document.documentElement.style.overflow;
    this.document.documentElement.style.overflow = 'hidden';
    this.expanded.set(true);
    afterNextRender(
      () => {
        const dialog = this.dialog()?.nativeElement;
        if (!dialog) {
          return;
        }
        // showModal keeps focus inside the player window and lets Esc close it.
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
        dialog.querySelector('iframe')?.focus();
      },
      { injector: this.injector }
    );
  }

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly poster = viewChild<ElementRef<HTMLButtonElement>>('poster');
  private readonly sanitizer = inject(DomSanitizer);
  private savedOverflow = '';
  private readonly vertical = signal(false);

  private embed(id: string): SafeResourceUrl | null {
    if (!YOUTUBE_ID.test(id)) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&fs=1`);
  }
}
