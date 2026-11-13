/** A short how-to clip hosted on the QuarterScore YouTube channel. */
export interface HowToVideo {
  /** The 11-character YouTube video ID. */
  youtubeId: string;
  /** Shown under the player and read out as the play button's label. */
  title: string;
  /** The line in the navy box on the poster. */
  caption: string;
  /** Length in seconds, shown on the poster. */
  seconds: number;
}

/**
 * Every how-to clip on the site, in one place. To swap a clip, change its ID here.
 * Clips are 1280 wide desktop recordings with a caption strip under them.
 */
export const HOWTO_VIDEOS = {
  createBoard: { youtubeId: 'E7pps5O65BM', title: 'Create a board', caption: 'Tap New board', seconds: 30 },
  pickSquares: { youtubeId: '5PjS38Sehr0', title: 'Pick your squares', caption: 'Tap an open square', seconds: 20 },
  lockAndDraw: { youtubeId: 'fwTM-LCwtKU', title: 'Lock and draw the numbers', caption: 'Tap Lock and draw', seconds: 17 },
  highlightPlayer: { youtubeId: 'PkffVOGg34s', title: 'Highlight a player’s squares', caption: 'Tap a name', seconds: 15 },
  hitRate: { youtubeId: 'P5nPXXfPrjY', title: 'Use the Hit rate tab', caption: 'Tap Hit rate', seconds: 19 },
  editGame: { youtubeId: 'DXY4T3dyBX8', title: 'Edit your game and add a note', caption: 'Tap Edit game', seconds: 25 },
  managePlayers: { youtubeId: '-vajIuxNQcE', title: 'Manage players', caption: 'Tap Manage players', seconds: 23 }
} satisfies Record<string, HowToVideo>;
