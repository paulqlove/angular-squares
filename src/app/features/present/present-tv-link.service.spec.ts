import { TestBed } from '@angular/core/testing';

import { GameService } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';
import { PresentTvLinkService } from './present-tv-link.service';

describe('PresentTvLinkService', () => {
  let service: PresentTvLinkService;
  let games: { saveTvLink: ReturnType<typeof vi.fn>; getRotationTvLink: ReturnType<typeof vi.fn>; getTvLink: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    games = {
      saveTvLink: vi.fn().mockResolvedValue('tok'),
      getRotationTvLink: vi.fn((token: string) => `https://x/tv/${token}`),
      getTvLink: vi.fn((id: string) => `https://x/present/${id}`)
    };
    toast = { success: vi.fn(), error: vi.fn() };
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({
      providers: [PresentTvLinkService, { provide: GameService, useValue: games }, { provide: ToastService, useValue: toast }]
    });
    service = TestBed.inject(PresentTvLinkService);
  });

  it('saves the group\'s boards, copies the link and names the group in the toast', async () => {
    await service.copyTvLink('u', 'a', { boardIds: ['a', 'b', 'c', 'd'], group: { id: 'WorkGroupKey00000001', name: 'Work' }, seconds: 10 }, true);
    expect(games.saveTvLink).toHaveBeenCalledWith('u', ['a', 'b', 'c', 'd'], 10, 'WorkGroupKey00000001');
    expect(writeText).toHaveBeenCalledWith('https://x/tv/tok');
    expect(toast.success.mock.calls[0][0]).toBe('TV link copied: Work, 4 boards, 10s each. Press it again after you change the time.');
    expect(service.hasRotationLink()).toBe(true);
  });

  it('counts no more than 20 boards in the toast', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `b${i}`);
    await service.copyTvLink('u', 'b0', { boardIds: ids, group: null, seconds: 20 }, true);
    expect(toast.success.mock.calls[0][0]).toMatch(/^TV link copied: 20 boards, 20s each\./);
    expect(games.saveTvLink).toHaveBeenCalledWith('u', ids, 20, null);
  });

  it('says so and copies nothing when the link cannot be saved', async () => {
    games.saveTvLink.mockRejectedValue({ code: 'PERMISSION_DENIED' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await service.copyTvLink('u', 'a', { boardIds: ['a', 'b'], group: { id: 'WorkGroupKey00000001', name: 'Work' }, seconds: 10 }, true);
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Could not make the TV link. Try again.');
    expect(service.hasRotationLink()).toBe(false);
  });

  describe('Copy TV link', () => {
    const work = { id: 'WorkGroupKey00000001', name: 'Work' };

    it('copies the group\'s rotating link when a group is picked and rotation is stopped', async () => {
      await service.copyTvLink('u', 'b', { boardIds: ['a', 'b', 'c'], group: work, seconds: 30 }, false);
      expect(games.saveTvLink).toHaveBeenCalledWith('u', ['a', 'b', 'c'], 30, 'WorkGroupKey00000001');
      expect(writeText).toHaveBeenCalledWith('https://x/tv/tok');
    });

    it('copies the rotating link while rotating, with or without a group', async () => {
      await service.copyTvLink('u', 'a', { boardIds: ['a', 'b'], group: null, seconds: 10 }, true);
      expect(games.saveTvLink).toHaveBeenCalledWith('u', ['a', 'b'], 10, null);
      expect(writeText).toHaveBeenCalledWith('https://x/tv/tok');
    });

    it('copies the one-board link for All groups while stopped', async () => {
      await service.copyTvLink('u', 'a', { boardIds: ['a', 'b'], group: null, seconds: 10 }, false);
      expect(games.saveTvLink).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith('https://x/present/a');
    });

    it('copies the one-board link when the group has only one board', async () => {
      await service.copyTvLink('u', 'a', { boardIds: ['a'], group: work, seconds: 10 }, false);
      expect(games.saveTvLink).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith('https://x/present/a');
    });

    it('copies the one-board link with no host account, even with a group picked', async () => {
      await service.copyTvLink(null, 'a', { boardIds: ['a', 'b'], group: work, seconds: 10 }, false);
      expect(games.saveTvLink).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith('https://x/present/a');
    });

    it('copies nothing with no host account and no board on screen', async () => {
      await service.copyTvLink(null, '', { boardIds: [], group: null, seconds: 10 }, false);
      expect(writeText).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('copies the one-board link with no host account while rotating', async () => {
      await service.copyTvLink(null, 'a', { boardIds: ['a', 'b'], group: work, seconds: 10 }, true);
      expect(games.saveTvLink).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith('https://x/present/a');
    });
  });
});
