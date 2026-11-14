import { TestBed } from '@angular/core/testing';
import { HowToVideoComponent } from './howto-video.component';
import { HowToVideo } from './howto-videos';

describe('HowToVideoComponent', () => {
  const clip: HowToVideo = {
    youtubeId: 'E7pps5O65BM',
    title: 'Create a board',
    description: 'A host makes a board.',
    uploadDate: '2026-11-13T10:01:58-08:00',
    seconds: 30
  };
  const embed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&fs=1`;
  const realMatchMedia = window.matchMedia;

  /** Stands in for the phone-width media query: true acts like a phone. */
  const screenIs = (phone: boolean) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: phone } as MediaQueryList);
  };

  afterEach(() => {
    window.matchMedia = realMatchMedia;
    document.documentElement.style.overflow = '';
  });

  const setup = (video: HowToVideo) => {
    const fixture = TestBed.createComponent(HowToVideoComponent);
    fixture.componentRef.setInput('video', video);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  const tap = async (fixture: ReturnType<typeof setup>['fixture'], el: HTMLElement) => {
    el.querySelector<HTMLButtonElement>('.howto-poster')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('shows the poster and loads nothing from YouTube until tapped', () => {
    const { el } = setup(clip);
    const button = el.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Play video: Create a board, 0:30');
    expect(el.querySelector('img')!.getAttribute('src')).toBe('https://i.ytimg.com/vi/E7pps5O65BM/maxresdefault.jpg');
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('shows the Short\'s thumbnail on phones when there is a Short', () => {
    const { el } = setup({ ...clip, phoneYoutubeId: 'mw8cVm6KS2g' });
    const source = el.querySelector('picture source')!;
    expect(source.getAttribute('media')).toBe('(max-width: 639.98px)');
    expect(source.getAttribute('srcset')).toBe('https://i.ytimg.com/vi/mw8cVm6KS2g/maxresdefault.jpg');
    expect(setup(clip).el.querySelector('picture source')).toBeNull();
  });

  it('plays the vertical Short in place on a phone, with full screen allowed', async () => {
    screenIs(true);
    const { fixture, el } = setup({ ...clip, phoneYoutubeId: 'mw8cVm6KS2g' });
    expect(el.classList).toContain('has-phone');
    await tap(fixture, el);
    const frame = el.querySelector('.howto-box iframe')!;
    expect(el.querySelector('.howto-poster')).toBeNull();
    expect(el.querySelector('dialog')).toBeNull();
    expect(frame.getAttribute('src')).toBe(embed('mw8cVm6KS2g'));
    expect(frame.getAttribute('title')).toBe('Create a board');
    expect(frame.hasAttribute('allowfullscreen')).toBe(true);
    expect(frame.getAttribute('allow')).toContain('fullscreen');
  });

  it('plays the desktop clip in place on a phone when there is no Short', async () => {
    screenIs(true);
    const { fixture, el } = setup(clip);
    expect(el.classList).not.toContain('has-phone');
    await tap(fixture, el);
    expect(el.querySelector('.howto-box iframe')!.getAttribute('src')).toBe(embed('E7pps5O65BM'));
  });

  it('opens the desktop clip large over the page on wider screens, and closes it again', async () => {
    screenIs(false);
    const { fixture, el } = setup({ ...clip, phoneYoutubeId: 'mw8cVm6KS2g' });
    await tap(fixture, el);
    const dialog = el.querySelector('dialog')!;
    const frame = dialog.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toBe(embed('E7pps5O65BM'));
    expect(frame.hasAttribute('allowfullscreen')).toBe(true);
    expect(el.querySelector('.howto-poster')).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('hidden');

    dialog.querySelector<HTMLButtonElement>('[aria-label="Close video"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.querySelector('iframe')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('renders nothing without a valid YouTube ID', () => {
    expect(setup({ ...clip, youtubeId: '' }).el.querySelector('figure')).toBeNull();
    expect(setup({ ...clip, youtubeId: 'bad"/><script>' }).el.querySelector('figure')).toBeNull();
  });
});
