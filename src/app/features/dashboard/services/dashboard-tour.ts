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
  /** Phone, host with no boards: the code field sits at the top of the page instead of in the bottom bar. */
  codeAtTop: boolean;
  /** New board's label, which reads Create your first board for a first-time host. */
  newBoardLabel: string;
}

/** The dashboard tour. On a phone, the create and join steps say where those controls are. */
export function dashboardTourSteps(steps: WalkthroughStep[], screen: DashboardTourScreen): WalkthroughStep[] {
  if (!screen.phone) return steps;
  const phoneText: Record<string, Partial<WalkthroughStep>> = {
    'create-game': { description: `Tap ${screen.newBoardLabel} at the bottom of the screen to start your own squares board. You can choose a sport, set points per square, and invite friends.` },
    'join-game': screen.codeAtTop
      ? { description: 'Have a game code? Type it here at the top of the screen and tap Join.', position: 'bottom' }
      : { description: 'Have a game code? Tap Games & codes at the bottom of the screen, type the code, and tap Join.' }
  };
  return steps.map(step => ({ ...step, ...phoneText[step.target] }));
}
