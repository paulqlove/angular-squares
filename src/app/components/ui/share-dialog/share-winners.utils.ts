/** Share winners, for finished games: the winners picture only, no link. Phones open the share sheet, desktop copies the picture, and anything else downloads it. */
import { browserShareEnv, isTouchDevice, ShareEnv } from './share-invite.utils';

/** What the browser offers for sharing a picture, on top of the share sheet and media queries. */
export interface WinnersEnv extends ShareEnv {
  canShare?: (data: ShareData) => boolean;
  /** Puts a PNG on the clipboard. Takes the picture as a promise so Safari can be handed it inside the tap. */
  writeImage?: (png: Promise<Blob>) => Promise<void>;
  download?: (file: Blob, fileName: string) => void;
}

/** The picture being drawn, the finished one once it's ready (so a phone's share sheet opens straight from the tap), and its file name. */
export interface WinnersPicture {
  image: Promise<Blob>;
  ready: Blob | null;
  fileName: string;
}

/** `dismissed`: the share sheet was closed, so nothing happens. `failed`: the picture couldn't be made or saved. */
export type ShareWinnersResult = 'shared' | 'copied' | 'downloaded' | 'dismissed' | 'failed';

/**
 * Must be called straight from the tap, before anything is awaited: on desktop the clipboard write starts at once,
 * which keeps Safari's user gesture.
 */
export function shareWinners(picture: WinnersPicture, env: WinnersEnv): Promise<ShareWinnersResult> {
  if (env.share && isTouchDevice(env)) return shareOnPhone(picture, env);
  if (env.writeImage) return copyOnDesktop(picture, env);
  return downloadPicture(picture, env);
}

/** The share button's text: Share winners on finished games, Share invite otherwise, and the copy confirmation for 2 seconds. */
export function shareButtonLabel(finished: boolean, justCopied: boolean): string {
  if (finished) return justCopied ? 'Image copied' : 'Share winners';
  return justCopied ? 'Link copied' : 'Share invite';
}

/** "quarterscore-winners-abc123.png". */
export function winnersFileName(gameId: string): string {
  const code = gameId.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return code ? `quarterscore-winners-${code}.png` : 'quarterscore-winners.png';
}

/** The real browser's share sheet, image clipboard and download, with the media queries from Share invite; empty on the server. */
export function browserWinnersEnv(): WinnersEnv {
  const base = browserShareEnv();
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return base;
  const canWriteImage = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
  return {
    ...base,
    canShare: typeof navigator.canShare === 'function' ? data => navigator.canShare(data) : undefined,
    writeImage: canWriteImage ? png => navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]) : undefined,
    download: saveFile
  };
}

async function shareOnPhone(picture: WinnersPicture, env: WinnersEnv): Promise<ShareWinnersResult> {
  let file: File;
  try {
    file = new File([picture.ready ?? (await picture.image)], picture.fileName, { type: 'image/png' });
  } catch {
    return 'failed';
  }
  if (env.canShare && !env.canShare({ files: [file] })) return downloadPicture(picture, env);
  try {
    await env.share?.({ files: [file] });
    return 'shared';
  } catch (error) {
    return isCancel(error) ? 'dismissed' : downloadPicture(picture, env);
  }
}

async function copyOnDesktop(picture: WinnersPicture, env: WinnersEnv): Promise<ShareWinnersResult> {
  try {
    await env.writeImage?.(picture.image);
    return 'copied';
  } catch {
    return downloadPicture(picture, env);
  }
}

async function downloadPicture(picture: WinnersPicture, env: WinnersEnv): Promise<ShareWinnersResult> {
  if (!env.download) return 'failed';
  try {
    env.download(await picture.image, picture.fileName);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

function isCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function saveFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Some browsers start the download after click returns, so the address is freed a little later.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
