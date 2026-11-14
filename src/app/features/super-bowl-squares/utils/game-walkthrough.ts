import type { WalkthroughStep } from '../../../core/services/walkthrough.service';

/** The game page's tour. Targets are the page's data-walkthrough attributes. */
const GAMEBOARD_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    target: 'player-name',
    title: 'Your name',
    description: 'Your name is what other players see on the squares you claim. Set it here, or change it later from your profile menu.',
    position: 'bottom'
  },
  {
    target: 'game-board',
    title: 'The game board',
    description: 'Tap any empty square to claim it. Check the Hit rate tab to see how often each square\'s digit pair has come up.',
    position: 'right'
  },
  {
    target: 'players-list',
    title: 'Players list',
    description: 'See all players and their squares. Tap a name to highlight their squares on the board.',
    position: 'left'
  },
  {
    target: 'share',
    title: 'Share',
    description: 'Share gives you the game code, the invite link and a TV link.',
    position: 'bottom'
  },
  {
    target: 'host-tools',
    title: 'Host tools',
    description: 'Lock the board, draw the numbers, manage players, and edit team names, points and your note.',
    position: 'top'
  },
  {
    target: 'winners-payouts',
    title: 'Winners',
    description: 'After the numbers are drawn and scores come in, you\'ll see the winners for each quarter here.',
    position: 'top'
  }
];

/** Tour steps; the host-only steps only for owner and co-host. */
export function walkthroughStepsFor(host: boolean): WalkthroughStep[] {
  return GAMEBOARD_WALKTHROUGH_STEPS.filter(step => host || step.target !== 'host-tools');
}
