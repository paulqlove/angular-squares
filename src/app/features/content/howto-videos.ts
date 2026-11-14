/** A valid YouTube video ID. Clips without one render nothing and get no structured data. */
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** A short how-to clip hosted on the QuarterScore YouTube channel. */
export interface HowToVideo {
  /** The 11-character YouTube video ID. */
  youtubeId: string;
  /** Shown under the player and read out as the play button's label. */
  title: string;
  /** One or two sentences for search engines (VideoObject description). Under 150 characters. */
  description: string;
  /** When the desktop clip went up on YouTube, as YouTube's own ISO 8601 date and time with offset. */
  uploadDate: string;
  /** Length in seconds, shown on the poster. */
  seconds: number;
  /** The vertical 9:16 Short of the same clip, played instead on phone widths. */
  phoneYoutubeId?: string;
}

/** The largest thumbnail YouTube serves for a video. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * Every how-to clip on the site, in one place. To swap a clip, change its ID here.
 * Clips are 1280 wide desktop recordings with a caption strip under them.
 * Each also has a vertical Short of the same clip, which phones play instead.
 * Upload dates are the desktop clips' dates as YouTube shows them on each watch page.
 */
export const HOWTO_VIDEOS = {
  createBoard: {
    youtubeId: 'E7pps5O65BM',
    title: 'Create a board',
    description: 'A host makes a free football squares board: names the teams, picks the sport, signs in to save it, and shares the link or six-character code.',
    uploadDate: '2026-11-13T10:01:58-08:00',
    seconds: 30,
    phoneYoutubeId: 'mw8cVm6KS2g'
  },
  pickSquares: {
    youtubeId: '5PjS38Sehr0',
    title: 'Pick your squares',
    description: 'Friends open the board link and type a name on empty squares to claim them. Players do not need an account.',
    uploadDate: '2026-11-13T10:11:23-08:00',
    seconds: 20,
    phoneYoutubeId: 'IDppJEHBk_g'
  },
  lockAndDraw: {
    youtubeId: 'fwTM-LCwtKU',
    title: 'Lock and draw the numbers',
    description: 'After the squares are claimed, the host locks the board and draws the digits 0 through 9 for each team.',
    uploadDate: '2026-11-13T10:12:29-08:00',
    seconds: 17,
    phoneYoutubeId: 'WPZ1O8n-83I'
  },
  highlightPlayer: {
    youtubeId: 'PkffVOGg34s',
    title: 'Highlight a player’s squares',
    description: 'Tap a name in the players list to light up that player’s squares on the board. Tap the name again to clear it.',
    uploadDate: '2026-11-13T10:13:30-08:00',
    seconds: 15,
    phoneYoutubeId: 'c5XMGo8ry6M'
  },
  hitRate: {
    youtubeId: 'P5nPXXfPrjY',
    title: 'Use the Hit rate tab',
    description: 'After the digits are drawn, the Hit rate tab shades each square by how often its digit pair has come up in past scores.',
    uploadDate: '2026-11-13T10:14:30-08:00',
    seconds: 19,
    phoneYoutubeId: '9b_VQOSLFlU'
  },
  editGame: {
    youtubeId: 'DXY4T3dyBX8',
    title: 'Edit your game and add a note',
    description: 'The host taps Edit game to change the name, teams or points, adds a note for players under More options, and saves the changes.',
    uploadDate: '2026-11-13T10:15:31-08:00',
    seconds: 25,
    phoneYoutubeId: 'v_O0Y-y8EMs'
  },
  managePlayers: {
    youtubeId: '-vajIuxNQcE',
    title: 'Manage players',
    description: 'The host opens Manage players to see everyone on the board, then confirms a player or removes one to open their squares back up.',
    uploadDate: '2026-11-13T10:16:51-08:00',
    seconds: 23,
    phoneYoutubeId: 'J3j5tqJvp58'
  }
} satisfies Record<string, HowToVideo>;
