export interface FirstTouch {
  at: number;
  camp?: string;
  med?: string;
  path: string;
  ref?: string;
  src?: string;
}

const KEY = 'qs_first_touch';
const DONE_KEY = 'qs_first_touch_done';

function clean(value: string | null, max: number): string | undefined {
  const text = (value ?? '').trim().toLowerCase().replace(/[^a-z0-9._\- ]/g, '').slice(0, max);
  return text || undefined;
}

/** Pure: where did this visit come from? Referrer host only, never full URLs. */
export function buildFirstTouch(href: string, referrer: string, now: number): FirstTouch {
  const url = new URL(href);
  let ref: string | undefined;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (host && host !== url.hostname.replace(/^www\./, '')) {
      ref = clean(host, 100);
    }
  } catch {
    ref = undefined;
  }
  const touch: FirstTouch = { at: now, path: url.pathname.slice(0, 200) };
  if (ref) touch.ref = ref;
  const src = clean(url.searchParams.get('utm_source'), 40);
  const med = clean(url.searchParams.get('utm_medium'), 40);
  const camp = clean(url.searchParams.get('utm_campaign'), 40);
  if (src) touch.src = src;
  if (med) touch.med = med;
  if (camp) touch.camp = camp;
  return touch;
}

/** Remember the first visit on this device. Runs once; later visits change nothing. */
export function captureFirstTouch(): void {
  try {
    if (localStorage.getItem(KEY) || localStorage.getItem(DONE_KEY)) return;
    localStorage.setItem(KEY, JSON.stringify(buildFirstTouch(location.href, document.referrer, Date.now())));
  } catch {
    // Storage blocked (private mode): skip.
  }
}

export function readFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as FirstTouch : null;
  } catch {
    return null;
  }
}

export function markFirstTouchDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
