import { WalkthroughStep } from '../../../core/services/walkthrough.service';

/** The dashboard tour, as the desktop shows it. */
export const DASHBOARD_TOUR_STEPS: WalkthroughStep[] = [
  {
    target: 'hero-section',
    title: 'Welcome to QuarterScore!',
    description: 'This is where you can create new games or join existing ones. Let\'s take a quick tour!',
    position: 'bottom'
  },
  {
    target: 'create-game',
    title: 'Create a new board',
    description: 'Tap here to start your own squares board. You can choose a sport, set points per square, and invite friends.',
    position: 'bottom'
  },
  {
    target: 'join-game',
    title: 'Search or join with a code',
    description: 'Type to find one of your boards, or enter a friend\'s 6-character game code and press Join.',
    position: 'bottom'
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

/** The dashboard tour. On a phone, join and create live in the bottom bar, so those two steps say so. */
export function dashboardTourSteps(steps: WalkthroughStep[], phone: boolean): WalkthroughStep[] {
  if (!phone) return steps;
  const phoneText: Record<string, Partial<WalkthroughStep>> = {
    'create-game': { description: 'Tap New board at the bottom of the screen to start your own squares board. You can choose a sport, set points per square, and invite friends.', position: 'top' },
    'join-game': { description: 'Have a game code? Tap Search or code at the bottom of the screen, type the code, and tap Join.', position: 'top' }
  };
  return steps.map(step => ({ ...step, ...phoneText[step.target] }));
}
