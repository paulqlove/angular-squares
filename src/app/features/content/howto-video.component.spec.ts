import { TestBed } from '@angular/core/testing';
import { HowToVideoComponent } from './howto-video.component';
import { HowToVideo } from './howto-videos';

describe('HowToVideoComponent', () => {
  const clip: HowToVideo = { youtubeId: 'E7pps5O65BM', title: 'Create a board', caption: 'Tap New board', seconds: 30 };

  const setup = (video: HowToVideo) => {
    const fixture = TestBed.createComponent(HowToVideoComponent);
    fixture.componentRef.setInput('video', video);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('shows the poster and loads nothing from YouTube until tapped', () => {
    const { el } = setup(clip);
    const button = el.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Play video: Create a board, 0:30');
    expect(el.textContent).toContain('Tap New board');
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('swaps the poster for the no-cookie player on tap', async () => {
    const { fixture, el } = setup(clip);
    el.querySelector('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const frame = el.querySelector('iframe')!;
    expect(el.querySelector('button')).toBeNull();
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/E7pps5O65BM?autoplay=1&rel=0&playsinline=1');
    expect(frame.getAttribute('title')).toBe('Create a board');
  });

  it('renders nothing without a valid YouTube ID', () => {
    expect(setup({ ...clip, youtubeId: '' }).el.querySelector('figure')).toBeNull();
    expect(setup({ ...clip, youtubeId: 'bad"/><script>' }).el.querySelector('figure')).toBeNull();
  });
});
