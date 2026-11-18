import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlanId } from '../plans';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';
import { PlanService } from './plan.service';
import { SeasonWelcomeService } from './season-welcome.service';
import { ToastService } from './toast.service';

/** The service with its two database calls stood in for. */
interface Db {
  read: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

describe('SeasonWelcomeService', () => {
  let service: SeasonWelcomeService;
  let db: Db;
  let plan: ReturnType<typeof signal<PlanId>>;
  let preview: boolean;
  let warning: ReturnType<typeof vi.fn>;

  /** Lets the effect run and the flag read settle. */
  async function settle(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    plan = signal<PlanId>('season');
    preview = false;
    warning = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameDatabaseService, useValue: { isBrowser: true } },
        { provide: AuthService, useValue: { realUser: signal({ uid: 'host' }), blockPreviewWrite: () => preview } },
        { provide: PlanService, useValue: { plan } },
        { provide: ToastService, useValue: { warning } }
      ]
    });
    service = TestBed.inject(SeasonWelcomeService);
    db = service as unknown as Db;
    db.read = vi.fn().mockResolvedValue(null);
    db.save = vi.fn().mockResolvedValue(undefined);
  });

  it('shows to a Season Pass host who has not closed it, after reading their flag once', async () => {
    expect(service.shows()).toBe(false);
    await settle();
    expect(service.shows()).toBe(true);
    expect(db.read.mock.calls).toEqual([['users/host/seasonWelcomeSeen']]);
    plan.set('free');
    await settle();
    plan.set('season');
    await settle();
    expect(db.read).toHaveBeenCalledTimes(1);
  });

  it('stays away once the flag is saved', async () => {
    db.read.mockResolvedValue(true);
    await settle();
    expect(service.shows()).toBe(false);
  });

  it('never reads or shows on another plan', async () => {
    plan.set('free');
    await settle();
    expect(db.read).not.toHaveBeenCalled();
    expect(service.shows()).toBe(false);
  });

  it('stays away when the flag cannot be read', async () => {
    db.read.mockRejectedValue(new Error('denied'));
    await settle();
    expect(service.shows()).toBe(false);
  });

  it('closes at once and saves the flag', async () => {
    await settle();
    await service.dismiss();
    expect(service.shows()).toBe(false);
    expect(db.save).toHaveBeenCalledWith('users/host/seasonWelcomeSeen', true);
  });

  it('closes without saving while the admin previews another role', async () => {
    preview = true;
    await settle();
    await service.dismiss();
    expect(service.shows()).toBe(false);
    expect(db.save).not.toHaveBeenCalled();
  });

  it('says so when the save fails, and stays closed', async () => {
    db.save.mockRejectedValue(new Error('offline'));
    await settle();
    await service.dismiss();
    expect(service.shows()).toBe(false);
    expect(warning).toHaveBeenCalled();
  });
});
