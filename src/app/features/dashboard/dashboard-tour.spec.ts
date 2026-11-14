import { WalkthroughStep } from '../../core/services/walkthrough.service';
import { dashboardTourSteps } from './services/dashboard-tour';

describe('dashboardTourSteps', () => {
  const steps: WalkthroughStep[] = [
    { target: 'hero-section', title: 'Welcome', description: 'Start here', position: 'bottom' },
    { target: 'create-game', title: 'Create', description: 'Click Create', position: 'bottom' },
    { target: 'join-game', title: 'Join', description: 'Enter a code', position: 'bottom' }
  ];

  it('leaves the desktop tour as it is', () => {
    expect(dashboardTourSteps(steps, false)).toBe(steps);
  });

  it('points phone users at the bottom bar for create and join', () => {
    const phone = dashboardTourSteps(steps, true);
    expect(phone[0]).toEqual(steps[0]);
    expect(phone[1].description).toContain('bottom of the screen');
    expect(phone[1].position).toBe('top');
    expect(phone[2].description).toContain('Games & codes');
    expect(phone[2].position).toBe('top');
    expect(phone[1].title).toBe('Create');
  });
});
