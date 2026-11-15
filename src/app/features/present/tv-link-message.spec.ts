import { tvLinkCopiedMessage } from './tv-link-message';

describe('tvLinkCopiedMessage', () => {
  it('names the group, the boards and the seconds, and nothing more since the TV follows the group', () => {
    expect(tvLinkCopiedMessage('Work', 4, 10)).toBe('TV link copied: Work, 4 boards, 10s each.');
  });

  it('leaves the group out under All groups, as before', () => {
    expect(tvLinkCopiedMessage(null, 6, 20)).toBe('TV link copied: 6 boards, 20s each. Press it again after you change boards or the time.');
  });

  it('says board for one', () => {
    expect(tvLinkCopiedMessage('Family', 1, 30)).toBe('TV link copied: Family, 1 board, 30s each.');
  });
});
