import { HOWTO_VIDEOS, HowToVideo } from './howto-videos';
import { MARKETING_PAGES, MarketingPage } from './marketing-pages';
import { isoDuration, pageVideos, videoObject } from './video-structured-data';

describe('video structured data', () => {
  const clip: HowToVideo = {
    youtubeId: 'E7pps5O65BM',
    title: 'Create a board',
    description: 'A host makes a board.',
    uploadDate: '2026-11-13T10:01:58-08:00',
    seconds: 30,
    phoneYoutubeId: 'mw8cVm6KS2g'
  };
  const page = (parts: Partial<MarketingPage>): MarketingPage => ({ ...MARKETING_PAGES['faq'], steps: undefined, faqs: undefined, sections: [], ...parts });

  it('describes the desktop clip with every field Google asks for', () => {
    expect(videoObject(clip)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Create a board',
      description: 'A host makes a board.',
      thumbnailUrl: 'https://i.ytimg.com/vi/E7pps5O65BM/maxresdefault.jpg',
      uploadDate: '2026-11-13T10:01:58-08:00',
      duration: 'PT30S',
      embedUrl: 'https://www.youtube.com/embed/E7pps5O65BM'
    });
  });

  it('writes lengths as ISO 8601 durations', () => {
    expect(isoDuration(0)).toBe('PT0S');
    expect(isoDuration(17)).toBe('PT17S');
    expect(isoDuration(60)).toBe('PT1M');
    expect(isoDuration(75)).toBe('PT1M15S');
  });

  it('collects the how-to-play step clips and the FAQ answer clips in page order', () => {
    expect(pageVideos(MARKETING_PAGES['how-to-play'])).toEqual([HOWTO_VIDEOS.createBoard, HOWTO_VIDEOS.pickSquares, HOWTO_VIDEOS.lockAndDraw]);
    expect(pageVideos(MARKETING_PAGES['faq'])).toEqual([HOWTO_VIDEOS.highlightPlayer, HOWTO_VIDEOS.editGame, HOWTO_VIDEOS.managePlayers, HOWTO_VIDEOS.hitRate]);
  });

  it('finds no clips on a page without any', () => {
    expect(pageVideos(page({}))).toEqual([]);
  });

  it('lists a clip once even when the page shows it twice', () => {
    const steps = [{ name: 'A', text: 'a', video: clip }];
    const faqs = [{ question: 'B', answer: 'b', video: clip }];
    expect(pageVideos(page({ steps, faqs }))).toEqual([clip]);
  });

  it('skips a clip the player would not render', () => {
    expect(pageVideos(page({ steps: [{ name: 'A', text: 'a', video: { ...clip, youtubeId: 'bad"/><x>' } }] }))).toEqual([]);
  });

  it('picks up a clip on a section', () => {
    const section = { heading: 'S', paragraphs: [], video: clip };
    expect(pageVideos(page({ sections: [section] }))).toEqual([clip]);
  });

  it('gives every clip a short description and a dated upload with its time zone', () => {
    for (const video of Object.values(HOWTO_VIDEOS) as HowToVideo[]) {
      expect(video.description.length).toBeGreaterThan(0);
      expect(video.description.length).toBeLessThan(150);
      expect(video.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      expect(Number.isNaN(Date.parse(video.uploadDate))).toBe(false);
    }
  });
});
