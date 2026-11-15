/** Share invite: the native share sheet on touch phones, a clipboard copy everywhere else. */

/** What the browser offers. Passed in so the phone or desktop choice can be tested without a device. */
export interface ShareEnv {
  matchMedia?: (query: string) => { matches: boolean };
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

/** `dismissed`: the share sheet was closed and the copy after it was refused, so there's nothing to report. */
export type ShareInviteResult = 'shared' | 'copied' | 'dismissed' | 'failed';

/** Touch is the main pointer and nothing hovers. Desktop browsers that support navigator.share still copy. */
const TOUCH_QUERIES = ['(pointer: coarse)', '(hover: none)'];

export function isTouchDevice(env: ShareEnv): boolean {
  const matchMedia = env.matchMedia;
  return !!matchMedia && TOUCH_QUERIES.every(query => matchMedia(query).matches);
}

export async function copyText(text: string, env: ShareEnv): Promise<boolean> {
  if (!env.writeText) return false;
  try {
    await env.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * On a phone, a share sheet that's missing, fails or is dismissed falls back to copying the link.
 * Only the link goes to the sheet: Android Chrome joins title and text into the message with the link, so apps sent the
 * link twice, once in the text and once as its preview. The link preview already shows the board's name and picture.
 */
export async function shareInvite(link: string, env: ShareEnv): Promise<ShareInviteResult> {
  if (env.share && isTouchDevice(env)) {
    try {
      await env.share({ url: link });
      return 'shared';
    } catch {
      // iOS can refuse the copy once the sheet has used up the tap, so a refusal here isn't an error.
      return (await copyText(link, env)) ? 'copied' : 'dismissed';
    }
  }
  return (await copyText(link, env)) ? 'copied' : 'failed';
}

/** The real browser's share, clipboard and media queries; empty on the server. */
export function browserShareEnv(): ShareEnv {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  return {
    matchMedia: typeof window.matchMedia === 'function' ? query => window.matchMedia(query) : undefined,
    share: typeof navigator.share === 'function' ? data => navigator.share(data) : undefined,
    writeText: navigator.clipboard ? text => navigator.clipboard.writeText(text) : undefined
  };
}
