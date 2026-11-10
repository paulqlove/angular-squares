import { TestBed } from '@angular/core/testing';
import { EspnGame, EspnService } from '../../core/services/espn.service';
import { CreateGameFormComponent } from './create-game-form.component';

const game = (id: string, away: string, home: string) => ({ id, awayTeam: away, homeTeam: home, awayTeamFull: away, homeTeamFull: home, date: '', status: 'pre' } as EspnGame);

describe('CreateGameFormComponent', () => {
  beforeEach(() => {
    sessionStorage.removeItem('qs_create_game');
    TestBed.configureTestingModule({
      providers: [{ provide: EspnService, useValue: { getGames: () => Promise.resolve([game('1', 'TB', 'CHI'), game('2', 'SF', 'KC')]) } }]
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(CreateGameFormComponent);
    fixture.componentInstance.espnGames.set([game('1', 'TB', 'CHI'), game('2', 'SF', 'KC')]);
    return fixture.componentInstance;
  }

  it('turns Auto-lock and draw on once the plan and profile default arrive, until the host chooses', () => {
    const fixture = TestBed.createComponent(CreateGameFormComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();
    expect(c.newGameAutoManage).toBe(false);
    fixture.componentRef.setInput('autoManageAllowed', true);
    fixture.componentRef.setInput('autoManageDefault', true);
    fixture.detectChanges();
    expect(c.newGameAutoManage).toBe(true);
    c.newGameAutoManage = false;
    c.autoManageTouched = true;
    fixture.componentRef.setInput('autoManageDefault', false);
    fixture.componentRef.setInput('autoManageDefault', true);
    fixture.detectChanges();
    expect(c.newGameAutoManage).toBe(false);
  });

  it('prefills the name from a picked game, then follows a new pick', () => {
    const c = setup();
    c.selectEspnGame('1');
    expect(c.newGameName).toBe('TB @ CHI squares');
    c.selectEspnGame('2');
    expect(c.newGameName).toBe('SF @ KC squares');
  });

  it('never overwrites a typed name, and prefills nothing for custom teams', () => {
    const c = setup();
    c.newGameName = 'Office party';
    c.selectEspnGame('1');
    expect(c.newGameName).toBe('Office party');
    c.newGameName = '';
    c.selectSport('custom');
    c.espnGames.set([game('1', 'TB', 'CHI')]);
    c.selectEspnGame('1');
    expect(c.newGameName).toBe('');
  });

  it('allows Create from the early steps only with a name and a valid split', () => {
    const c = setup();
    expect(c.canCreate()).toBe(false);
    c.newGameName = 'Party';
    expect(c.canCreate()).toBe(true);
    c.newGameSplitPct = { q1: 10, q2: 10, q3: 10, q4: 10 };
    expect(c.canCreate()).toBe(false);
  });

  it('keeps Next disabled on an invalid split and Enter does not advance', () => {
    const fixture = TestBed.createComponent(CreateGameFormComponent);
    const c = fixture.componentInstance;
    c.customSplitsAllowed = true;
    c.step.set(3);
    c.newGameSplitPct = { q1: 10, q2: 10, q3: 10, q4: 10 };
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    c.onSubmit(new Event('submit'));
    expect(c.step()).toBe(3);
  });

  it('disables Create on step 4 while the name is empty', () => {
    const fixture = TestBed.createComponent(CreateGameFormComponent);
    fixture.componentInstance.step.set(4);
    fixture.detectChanges();
    const create = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Name your game to create it.');
  });
});
