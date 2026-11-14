/**
 * FLIP for elements that change place (docs/DESIGN.md, Dashboard card changes group). Mark each one with a
 * `data-flip-id`, call captureLayout before the change renders and glideToNewLayout after. Everything that stayed
 * glides from its old spot to its new one, transform only. Moved elements fade out where they were and in where they
 * land. Web Animations with no fill, so nothing lingers. Callers skip both under reduced motion.
 */
export type LayoutSnapshot = ReadonlyMap<string, DOMRect>;

const EASE = 'cubic-bezier(.2,.7,.2,1)'; // --qs-ease
const EASE_IN = 'cubic-bezier(.4,0,1,1)'; // --qs-ease-in
const GLIDE_MS = 240;
const LAND_MS = 200; // --qs-t-state
const LEAVE_MS = 120; // --qs-t-fast

/** Where each marked element sits now. Moved ones also leave a copy behind in `host` that fades out. */
export function captureLayout(root: ParentNode, moved: ReadonlySet<string>, host: HTMLElement): LayoutSnapshot {
  const rects = new Map<string, DOMRect>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-flip-id]')) {
    const id = el.dataset['flipId'] as string;
    const rect = el.getBoundingClientRect();
    rects.set(id, rect);
    if (moved.has(id)) fadeOutInPlace(el, rect, host);
  }
  return rects;
}

/** Plays the move: the rest glide from where they were, moved ones fade in where they landed. */
export function glideToNewLayout(root: ParentNode, before: LayoutSnapshot, moved: ReadonlySet<string>): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-flip-id]')) {
    const id = el.dataset['flipId'] as string;
    if (moved.has(id)) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LAND_MS, easing: EASE });
      continue;
    }
    const was = before.get(id);
    if (!was) continue;
    const now = el.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: GLIDE_MS, easing: EASE });
  }
}

/** A still copy of the element over its old spot, fading out. Its parent's classes come along, so it looks the same. */
function fadeOutInPlace(el: HTMLElement, rect: DOMRect, host: HTMLElement): void {
  const frame = (el.parentElement?.cloneNode(false) ?? document.createElement('div')) as HTMLElement;
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    display: 'block', margin: '0', pointerEvents: 'none', zIndex: '30'
  });
  const copy = el.cloneNode(true) as HTMLElement;
  copy.removeAttribute('data-flip-id');
  frame.appendChild(copy);
  host.appendChild(frame);
  frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LEAVE_MS, easing: EASE_IN }).onfinish = () => frame.remove();
}
