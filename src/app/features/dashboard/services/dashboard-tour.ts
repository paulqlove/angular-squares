import { WalkthroughStep } from '../../../core/services/walkthrough.service';

/** The dashboard tour, as the desktop shows it. New board and the search-or-code field sit in the taskbar along the
 * bottom of the screen, so their cards sit above them. */
export const DASHBOARD_TOUR_STEPS: WalkthroughStep[] = [
  {
    target: 'create-game',
    title: 'Create a new board',
    description: 'Tap here to start your own squares board. You can choose a sport, set points per square, and invite friends.',
    position: 'top'
  },
  {
    target: 'join-game',
    title: 'Search or join with a code',
    description: 'Type to find one of your boards, or enter a friend\'s 6-character game code and press Join.',
    position: 'top'
  },
  {
    target: 'my-games',
    title: 'Your games',
    description: 'All the games you\'ve created will appear here. You can manage, share, or delete them anytime.',
    position: 'top'
  },
  {
    target: 'profile-dropdown',
    title: 'Your profile',
    description: 'Tap here to update your display name, change the theme, or sign out.',
    position: 'bottom'
  }
];

/** What the tour needs to know about the screen it runs on. */
export interface DashboardTourScreen {
  phone: boolean;
  /** False for a guest, who has no New board and no games of their own to point at. */
  host: boolean;
  /** Host with no boards: nothing to search, so the join step is only about the code. On a phone their code field sits
   * at the top of the page instead of in the bottom bar. */
  noBoards: boolean;
  /** New board's label, which reads Create your first board for a first-time host. */
  newBoardLabel: string;
}

/** Steps a guest skips, since nothing on their dashboard matches them. */
const HOST_ONLY = ['create-game', 'my-games'];

/** The dashboard tour. A guest skips the host steps; on a phone, the create and join steps say where those controls are;
 * a host with no boards hears only about joining with a code. */
export function dashboardTourSteps(steps: WalkthroughStep[], screen: DashboardTourScreen): WalkthroughStep[] {
  const shown = screen.host ? steps : steps.filter(step => !HOST_ONLY.includes(step.target));
  const text = screen.phone ? phoneText(screen) : deskText(screen);
  return shown.map(step => ({ ...step, ...text[step.target] }));
}

function deskText(screen: DashboardTourScreen): Record<string, Partial<WalkthroughStep>> {
  return screen.noBoards ? { 'join-game': { description: 'Have a game code? Type it here and press Join.' } } : {};
}

function phoneText(screen: DashboardTourScreen): Record<string, Partial<WalkthroughStep>> {
  return {
    'create-game': { description: `Tap ${screen.newBoardLabel} at the bottom of the screen to start your own squares board. You can choose a sport, set points per square, and invite friends.` },
    'join-game': screen.noBoards
      ? { description: 'Have a game code? Type it here at the top of the screen and tap Join.', position: 'bottom' }
      : { description: 'Have a game code? Tap Games & codes at the bottom of the screen, type the code, and tap Join.' }
  };
}
