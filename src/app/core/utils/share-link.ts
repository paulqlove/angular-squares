/** The board link to share. A dark-theme sharer adds ?theme=dark so the link preview matches their screen; light is the default. */
export function shareLinkWithTheme(link: string, theme: 'light' | 'dark'): string {
  return theme === 'dark' ? `${link}?theme=dark` : link;
}
