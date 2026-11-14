/** A site path in a page link: lowercase words and slashes only, so it is safe inside an href. Not `//`, which would leave the site. */
const SITE_LINK = /\[([^\]]+)\]\((\/(?!\/)[a-z0-9/-]*)\)/g;

/**
 * Turns marketing page copy into HTML. Everything is escaped first, then two marks are allowed:
 * **bold** for button and menu names, and [label](/path) for a link to another page on the site.
 */
export function richText(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(SITE_LINK, '<a href="$2" class="font-medium text-qs-accent underline underline-offset-2">$1</a>');
}
