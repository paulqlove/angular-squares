import { HowToVideo, YOUTUBE_ID, youtubeThumbnail } from './howto-videos';
import type { MarketingPage } from './marketing-pages';

/** Seconds as an ISO 8601 duration: 30 is PT30S, 75 is PT1M15S. */
export function isoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `PT${minutes ? `${minutes}M` : ''}${rest || !minutes ? `${rest}S` : ''}`;
}

/**
 * Every clip a page shows, in page order, once each, skipping clips the player would not render.
 * Reads the same places the marketing page template renders a clip: steps, then FAQ answers, then sections.
 * Google only accepts a VideoObject for a video that is visible on the page, so a new place for clips goes in both.
 */
export function pageVideos(page: MarketingPage): HowToVideo[] {
  const clips = [...(page.steps ?? []), ...(page.faqs ?? []), ...page.sections].map(part => part.video);
  const seen = new Set<string>();
  const videos: HowToVideo[] = [];
  for (const video of clips) {
    if (video && YOUTUBE_ID.test(video.youtubeId) && !seen.has(video.youtubeId)) {
      seen.add(video.youtubeId);
      videos.push(video);
    }
  }
  return videos;
}

/**
 * schema.org VideoObject for a how-to clip, for Google's video results.
 * Describes the desktop clip, not the phone Short. The embed is YouTube's own player address,
 * the one YouTube publishes for the clip, so Google ties it to the video it already knows.
 */
export function videoObject(video: HowToVideo): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: youtubeThumbnail(video.youtubeId),
    uploadDate: video.uploadDate,
    duration: isoDuration(video.seconds),
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`
  };
}
