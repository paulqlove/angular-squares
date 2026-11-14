/** A short how-to clip hosted on the QuarterScore YouTube channel. */
export interface HowToVideo {
  /** The 11-character YouTube video ID. */
  youtubeId: string;
  /** Shown under the player and read out as the play button's label. */
  title: string;
  /** Length in seconds, shown on the poster. */
  seconds: number;
  /** The vertical 9:16 Short of the same clip, played instead on phone widths. */
  phoneYoutubeId?: string;
}

/**
 * Every how-to clip on the site, in one place. To swap a clip, change its ID here.
 * Clips are 1280 wide desktop recordings with a caption strip under them.
 * Each also has a vertical Short of the same clip, which phones play instead.
 */
export const HOWTO_VIDEOS = {
  createBoard: { youtubeId: 'E7pps5O65BM', title: 'Create a board', seconds: 30, phoneYoutubeId: 'mw8cVm6KS2g' },
  pickSquares: { youtubeId: '5PjS38Sehr0', title: 'Pick your squares', seconds: 20, phoneYoutubeId: 'IDppJEHBk_g' },
  lockAndDraw: { youtubeId: 'fwTM-LCwtKU', title: 'Lock and draw the numbers', seconds: 17, phoneYoutubeId: 'WPZ1O8n-83I' },
  highlightPlayer: { youtubeId: 'PkffVOGg34s', title: 'Highlight a player’s squares', seconds: 15, phoneYoutubeId: 'c5XMGo8ry6M' },
  hitRate: { youtubeId: 'P5nPXXfPrjY', title: 'Use the Hit rate tab', seconds: 19, phoneYoutubeId: '9b_VQOSLFlU' },
  editGame: { youtubeId: 'DXY4T3dyBX8', title: 'Edit your game and add a note', seconds: 25, phoneYoutubeId: 'v_O0Y-y8EMs' },
  managePlayers: { youtubeId: '-vajIuxNQcE', title: 'Manage players', seconds: 23, phoneYoutubeId: 'J3j5tqJvp58' }
} satisfies Record<string, HowToVideo>;
