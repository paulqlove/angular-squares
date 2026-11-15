import { TestBed } from '@angular/core/testing';

import { GameService } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';
import { PresentTvLinkService } from './present-tv-link.service';

describe('PresentTvLinkService', () => {
  let service: PresentTvLinkService;
  let games: { saveTvLink: ReturnType<typeof vi.fn>; getRotationTvLink: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    games = {
      saveTvLink: vi.fn().mockResolvedValue('tok'),
      getRotationTvLink: vi.fn((token: string) => `https://x/tv/${token}`)
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
    await service.copyRotationLink('u', { boardIds: ['a', 'b', 'c', 'd'], groupName: 'Work', seconds: 10 });
    expect(games.saveTvLink).toHaveBeenCalledWith('u', ['a', 'b', 'c', 'd'], 10);
    expect(writeText).toHaveBeenCalledWith('https://x/tv/tok');
    expect(toast.success.mock.calls[0][0]).toMatch(/^TV link copied: Work, 4 boards, 10s each\./);
    expect(service.hasRotationLink()).toBe(true);
  });

  it('counts no more than 20 boards in the toast', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `b${i}`);
    await service.copyRotationLink('u', { boardIds: ids, groupName: null, seconds: 20 });
    expect(toast.success.mock.calls[0][0]).toMatch(/^TV link copied: 20 boards, 20s each\./);
  });

  it('says so and copies nothing when the link cannot be saved', async () => {
    games.saveTvLink.mockRejectedValue({ code: 'PERMISSION_DENIED' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await service.copyRotationLink('u', { boardIds: ['a', 'b'], groupName: 'Work', seconds: 10 });
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Could not make the TV link. Try again.');
    expect(service.hasRotationLink()).toBe(false);
  });
});
