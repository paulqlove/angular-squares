import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { RECENT_GAMES_KEY } from '../../../core/utils/recent-games';
import { YourGamesMenuComponent } from './your-games-menu.component';

const game = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: `Game ${id}`, ownerId: 'someone', homeTeam: 'Eagles', awayTeam: 'Cowboys', boardSize: 100, isLocked: false, selectedSquares: {}, ...extra
});

describe('YourGamesMenuComponent', () => {
  let games: Record<string, ReturnType<typeof game> | null>;
  let index: { id: string; at: number }[];
  const user = signal<{ uid: string; isGuest: boolean } | null>({ uid: 'me', isGuest: false });

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [YourGamesMenuComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user, canCreateGame: () => !!user() && !user()!.isGuest } },
        {
          provide: GameService,
          useValue: {
            getYourGameIndex: async () => index,
            getGame: async (id: string) => games[id] ?? null
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(YourGamesMenuComponent);
    fixture.componentRef.setInput('currentGameId', 'CUR001');
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    await new Promise(r => setTimeout(r));
    fixture.detectChanges();
    return fixture;
  };

  const rowNames = (el: HTMLElement) => [...el.querySelectorAll('a[aria-label^="Open "]')].map(a => a.getAttribute('aria-label'));

  beforeEach(() => {
    localStorage.removeItem(RECENT_GAMES_KEY);
    user.set({ uid: 'me', isGuest: false });
    games = {
      CUR001: game('CUR001', { ownerId: 'me' }),
      OLD001: game('OLD001', { isLocked: true }),
      NEW001: game('NEW001')
    };
    index = [{ id: 'CUR001', at: 1 }, { id: 'OLD001', at: 5 }, { id: 'NEW001', at: 9 }];
  });

  it('lists the game on screen first, then the newest, with Host and Viewing tags', async () => {
    const el: HTMLElement = (await setup()).nativeElement;
    expect(rowNames(el)).toEqual(['Open Game CUR001', 'Open Game NEW001', 'Open Game OLD001']);
    const current = el.querySelector('a[aria-current="page"]')!;
    expect(current.textContent).toContain('Host');
    expect(current.textContent).toContain('Viewing');
    expect(el.textContent).toContain('3 recent');
    expect(el.textContent).toContain('100 open');
    expect(el.textContent).toContain('Locked');
    expect(el.textContent).not.toContain('Create a game');
    expect(el.textContent).toContain('My dashboard');
  });

  it('offers Create a game when there is only one game, and sends guests to the public set-up page', async () => {
    user.set({ uid: 'guest-1', isGuest: true });
    const el: HTMLElement = (await setup()).nativeElement;
    expect(rowNames(el)).toEqual(['Open Game CUR001']);
    expect(el.textContent).toContain('1 game');
    const create = [...el.querySelectorAll('a')].find(a => a.textContent?.includes('Create a game'))!;
    expect(create.getAttribute('href')).toBe('/create');
  });

  it('shows games a guest opened on this device and drops deleted ones', async () => {
    user.set({ uid: 'guest-1', isGuest: true });
    localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify([{ id: 'GONE01', at: 9 }, { id: 'OLD001', at: 5 }]));
    const el: HTMLElement = (await setup()).nativeElement;
    expect(rowNames(el)).toEqual(['Open Game CUR001', 'Open Game OLD001']);
    expect(localStorage.getItem(RECENT_GAMES_KEY)).not.toContain('GONE01');
  });

  it('joins a game by its code', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    [...el.querySelectorAll('button')].find(b => b.textContent?.includes('Join with a code'))!.click();
    fixture.detectChanges();
    const input = el.querySelector<HTMLInputElement>('#your-games-code')!;
    input.value = 'ab-c12 3';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenCalledWith(['/game', 'ABC123']);
  });
});
