import { copyText, isTouchDevice, ShareEnv, shareInvite } from './share-invite.utils';

const LINK = 'https://quarterscore.com/game/ABC123';

function media(touch: boolean): ShareEnv['matchMedia'] {
  return query => ({ matches: touch ? ['(pointer: coarse)', '(hover: none)'].includes(query) : false });
}

function env(opts: { touch: boolean; share?: 'ok' | 'reject' | 'none'; copy?: 'ok' | 'reject' | 'none' }) {
  const calls = { shared: 0, copied: [] as string[] };
  const result: ShareEnv = { matchMedia: media(opts.touch) };
  if (opts.share !== 'none') {
    result.share = () => {
      calls.shared++;
      return opts.share === 'reject' ? Promise.reject(new DOMException('Cancelled', 'AbortError')) : Promise.resolve();
    };
  }
  if (opts.copy !== 'none') {
    result.writeText = text => {
      calls.copied.push(text);
      return opts.copy === 'reject' ? Promise.reject(new Error('denied')) : Promise.resolve();
    };
  }
  return { env: result, calls };
}

describe('isTouchDevice', () => {
  it('is true only when the pointer is coarse and nothing hovers', () => {
    expect(isTouchDevice({ matchMedia: media(true) })).toBe(true);
    expect(isTouchDevice({ matchMedia: media(false) })).toBe(false);
    expect(isTouchDevice({ matchMedia: query => ({ matches: query === '(pointer: coarse)' }) })).toBe(false);
  });

  it('is false without matchMedia', () => {
    expect(isTouchDevice({})).toBe(false);
  });
});

describe('shareInvite', () => {
  it('opens the share sheet on a phone', async () => {
    const { env: e, calls } = env({ touch: true, share: 'ok' });
    expect(await shareInvite(LINK, e)).toBe('shared');
    expect(calls.shared).toBe(1);
    expect(calls.copied).toEqual([]);
  });

  it('copies on desktop even when the browser supports share', async () => {
    const { env: e, calls } = env({ touch: false, share: 'ok' });
    expect(await shareInvite(LINK, e)).toBe('copied');
    expect(calls.shared).toBe(0);
    expect(calls.copied).toEqual([LINK]);
  });

  it('copies on a phone when the share sheet is rejected', async () => {
    const { env: e, calls } = env({ touch: true, share: 'reject' });
    expect(await shareInvite(LINK, e)).toBe('copied');
    expect(calls.copied).toEqual([LINK]);
  });

  it('stays quiet on a phone when the sheet is dismissed and the copy is refused', async () => {
    expect(await shareInvite(LINK, env({ touch: true, share: 'reject', copy: 'reject' }).env)).toBe('dismissed');
  });

  it('copies on a phone without share support', async () => {
    const { env: e, calls } = env({ touch: true, share: 'none' });
    expect(await shareInvite(LINK, e)).toBe('copied');
    expect(calls.copied).toEqual([LINK]);
  });

  it('reports failed when the clipboard refuses or is missing', async () => {
    expect(await shareInvite(LINK, env({ touch: false, copy: 'reject' }).env)).toBe('failed');
    expect(await shareInvite(LINK, env({ touch: false, copy: 'none' }).env)).toBe('failed');
  });
});

describe('copyText', () => {
  it('returns true when the clipboard takes the text', async () => {
    const { env: e, calls } = env({ touch: false });
    expect(await copyText('ABC123', e)).toBe(true);
    expect(calls.copied).toEqual(['ABC123']);
  });
});
