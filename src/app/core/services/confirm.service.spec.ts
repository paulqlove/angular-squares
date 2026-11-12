import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  const opts = { title: 'Delete this game?', message: 'x', confirmLabel: 'Delete game' };

  it('resolves true on confirm and clears the question', async () => {
    const s = new ConfirmService();
    const p = s.ask(opts);
    expect(s.pending()?.title).toBe('Delete this game?');
    s.answer(true);
    expect(await p).toBe(true);
    expect(s.pending()).toBeNull();
  });

  it('resolves false on cancel', async () => {
    const s = new ConfirmService();
    const p = s.ask(opts);
    s.answer(false);
    expect(await p).toBe(false);
  });

  it('cancels an open question when a new one is asked', async () => {
    const s = new ConfirmService();
    const first = s.ask(opts);
    const second = s.ask({ ...opts, title: 'Other' });
    expect(await first).toBe(false);
    s.answer(true);
    expect(await second).toBe(true);
  });

  describe('never show again', () => {
    const key = 'qs_skip_confirm_test';
    beforeEach(() => localStorage.removeItem(key));
    afterEach(() => localStorage.removeItem(key));

    it('skips the dialog after confirming with the box ticked', async () => {
      const s = new ConfirmService();
      const p = s.ask({ ...opts, rememberKey: 'test' });
      s.answer(true, true);
      await p;
      expect(await s.ask({ ...opts, rememberKey: 'test' })).toBe(true);
      expect(s.pending()).toBeNull();
    });

    it('still asks when the box is ticked but the answer is cancel', async () => {
      const s = new ConfirmService();
      const p = s.ask({ ...opts, rememberKey: 'test' });
      s.answer(false, true);
      await p;
      s.ask({ ...opts, rememberKey: 'test' });
      expect(s.pending()).not.toBeNull();
    });
  });
});
