/** -1 for ArrowLeft, 1 for ArrowRight, 0 when the key press should be ignored (typing, dialogs, shortcuts). */
export function boardArrowStep(event: KeyboardEvent): -1 | 0 | 1 {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return 0;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return 0;
  if (document.querySelector('[role="dialog"], [aria-modal="true"], dialog[open]')) return 0;
  return event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
}
