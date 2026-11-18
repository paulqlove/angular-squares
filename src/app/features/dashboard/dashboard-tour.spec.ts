import { WalkthroughStep } from '../../core/services/walkthrough.service';
import { DASHBOARD_TOUR_STEPS, DashboardTourScreen, dashboardTourSteps } from './services/dashboard-tour';

describe('DASHBOARD_TOUR_STEPS', () => {
  it('has no step on the page heading, since Search and New board left it for the taskbar', () => {
    expect(DASHBOARD_TOUR_STEPS.map(step => step.target)).toEqual(['create-game', 'join-game', 'my-games', 'profile-dropdown']);
  });

  it('puts the create and join cards above the taskbar', () => {
    const atBottom = DASHBOARD_TOUR_STEPS.filter(step => step.target === 'create-game' || step.target === 'join-game');
    expect(atBottom.map(step => step.position)).toEqual(['top', 'top']);
  });
});

describe('dashboardTourSteps', () => {
  const steps: WalkthroughStep[] = [
    { target: 'my-games', title: 'Games', description: 'Your boards', position: 'top' },
    { target: 'create-game', title: 'Create', description: 'Click Create', position: 'top' },
    { target: 'join-game', title: 'Join', description: 'Enter a code', position: 'top' }
  ];
  const phone: DashboardTourScreen = { phone: true, host: true, noBoards: false, newBoardLabel: 'New board' };

  it('leaves the desktop tour as it is', () => {
    expect(dashboardTourSteps(steps, { ...phone, phone: false })).toEqual(steps);
  });

  it('tells a desktop host with no boards only about joining with a code', () => {
    const join = dashboardTourSteps(steps, { ...phone, phone: false, noBoards: true })[2];
    expect(join.description).toBe('Have a game code? Type it here and press Join.');
    expect(join.position).toBe('top');
  });

  it('skips the create and games steps for a guest, who has neither', () => {
    expect(dashboardTourSteps(steps, { ...phone, phone: false, host: false }).map(step => step.target)).toEqual(['join-game']);
    expect(dashboardTourSteps(steps, { ...phone, host: false }).map(step => step.target)).toEqual(['join-game']);
  });

  it('points phone users at the bottom bar for create and join', () => {
    const tour = dashboardTourSteps(steps, phone);
    expect(tour[0]).toEqual(steps[0]);
    expect(tour[1].description).toContain('Tap New board at the bottom of the screen');
    expect(tour[1].position).toBe('top');
    expect(tour[1].title).toBe('Create');
    expect(tour[2].description).toContain('Games & codes at the bottom of the screen');
    expect(tour[2].position).toBe('top');
  });

  it('names the button a first-time host sees', () => {
    const tour = dashboardTourSteps(steps, { ...phone, newBoardLabel: 'Create your first board' });
    expect(tour[1].description).toContain('Tap Create your first board at the bottom');
  });

  it('points a phone host with no boards at the code field at the top', () => {
    const join = dashboardTourSteps(steps, { ...phone, noBoards: true })[2];
    expect(join.description).toContain('at the top of the screen');
    expect(join.description).not.toContain('bottom');
    expect(join.position).toBe('bottom');
  });
});
