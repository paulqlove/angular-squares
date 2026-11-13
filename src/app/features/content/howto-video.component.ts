import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HowToVideo } from './howto-videos';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * A how-to clip that costs nothing until it is tapped: a drawn poster first,
 * then the youtube-nocookie player in the same box. Renders nothing without a valid ID.
 */
@Component({
  selector: 'app-howto-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (src(); as url) {
      <figure class="not-prose">
        <div class="relative overflow-hidden rounded-card border border-qs-line bg-qs-canvas" style="aspect-ratio: 1280 / 872">
          @if (playing()) {
            <iframe
              class="absolute inset-0 h-full w-full"
              [src]="url"
              [title]="video().title"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"></iframe>
          } @else {
            <button type="button" (click)="play()" class="howto-poster group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus" [attr.aria-label]="'Play video: ' + video().title + ', ' + length()">
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
    }
  `,
  styles: `
    :host {
      container-type: inline-size;
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
  `
})
export class HowToVideoComponent {
  /** The clip's length as m:ss. */
  public readonly length = computed(() => {
    const total = this.video().seconds;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });

  public readonly playing = signal(false);

  /** The player's address, or null when the ID is missing or malformed. */
  public readonly src = computed<SafeResourceUrl | null>(() => {
    const id = this.video().youtubeId;
    if (!YOUTUBE_ID.test(id)) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`);
  });

  public readonly video = input.required<HowToVideo>();

  public play(): void {
    this.playing.set(true);
    // The poster button is gone now, so hand focus to the player instead of dropping it on the page.
    afterNextRender(() => this.host.nativeElement.querySelector('iframe')?.focus(), { injector: this.injector });
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);
}
