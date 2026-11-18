import { shareLinkWithTheme } from './share-link';

describe('shareLinkWithTheme', () => {
  it('adds the theme only for dark', () => {
    expect(shareLinkWithTheme('https://quarterscore.com/game/K7QX2P', 'dark')).toBe('https://quarterscore.com/game/K7QX2P?theme=dark');
    expect(shareLinkWithTheme('https://quarterscore.com/game/K7QX2P', 'light')).toBe('https://quarterscore.com/game/K7QX2P');
  });
});
