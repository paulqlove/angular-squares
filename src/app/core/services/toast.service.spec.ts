import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ToastService();
  });

  afterEach(() => vi.useRealTimers());

  it('shows an info note and clears it after 4 seconds', () => {
    service.info('Groups filter your boards');
    expect(service.toasts().map(t => [t.message, t.type])).toEqual([['Groups filter your boards', 'info']]);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toEqual([]);
  });

  it('does not stack the same info note twice', () => {
    service.info('Groups filter your boards');
    service.info('Groups filter your boards');
    expect(service.toasts().length).toBe(1);
  });

  it('shows the note again once the first one is gone', () => {
    service.info('Groups filter your boards');
    vi.advanceTimersByTime(4000);
    service.info('Groups filter your boards');
    expect(service.toasts().length).toBe(1);
  });
});
