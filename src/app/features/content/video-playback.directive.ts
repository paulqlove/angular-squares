import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { VideoPlaybackService } from './video-playback.service';

/** Put on a how-to player's iframe: while it is on the page, starting it pauses every other clip, and starting another pauses it. */
@Directive({ selector: 'iframe[appVideoPlayback]' })
export class VideoPlaybackDirective {
  constructor() {
    const forget = inject(VideoPlaybackService).register(inject<ElementRef<HTMLIFrameElement>>(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(forget);
  }
}
