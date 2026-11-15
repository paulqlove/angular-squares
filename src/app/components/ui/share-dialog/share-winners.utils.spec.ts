import { shareButtonLabel, shareWinners, WinnersEnv, winnersFileName, WinnersPicture } from './share-winners.utils';

const PNG = new Blob(['png'], { type: 'image/png' });

function picture(opts: { ready?: boolean; broken?: boolean } = {}): WinnersPicture {
  const image = opts.broken ? Promise.reject(new Error('No canvas')) : Promise.resolve(PNG);
  image.catch(() => undefined);
  return { image, ready: opts.ready ? PNG : null, fileName: 'quarterscore-winners-abc123.png' };
}

function media(touch: boolean): WinnersEnv['matchMedia'] {
  return query => ({ matches: touch ? ['(pointer: coarse)', '(hover: none)'].includes(query) : false });
}

type Outcome = 'ok' | 'cancel' | 'reject' | 'none';

function env(opts: { touch: boolean; share?: Outcome; canShare?: boolean; copy?: Outcome; download?: boolean }) {
  const calls = { shared: [] as ShareData[], copied: [] as Promise<Blob>[], downloaded: [] as string[], linkCopies: 0 };
  const result: WinnersEnv = { matchMedia: media(opts.touch), writeText: () => { calls.linkCopies++; return Promise.resolve(); } };
  if ((opts.share ?? 'ok') !== 'none') {
    result.share = data => {
      calls.shared.push(data);
      if (opts.share === 'cancel') return Promise.reject(new DOMException('Cancelled', 'AbortError'));
      if (opts.share === 'reject') return Promise.reject(new DOMException('No gesture', 'NotAllowedError'));
      return Promise.resolve();
    };
  }
  if (opts.canShare !== undefined) result.canShare = () => opts.canShare!;
  if ((opts.copy ?? 'ok') !== 'none') {
    result.writeImage = png => {
      calls.copied.push(png);
      // Like the real clipboard, the write fails when the picture does.
      return opts.copy === 'reject' ? Promise.reject(new Error('denied')) : png.then(() => undefined);
    };
  }
  if (opts.download !== false) result.download = (_file, name) => calls.downloaded.push(name);
  return { env: result, calls };
}

describe('shareWinners', () => {
  it('opens the share sheet on a phone with the picture only, no link or text', async () => {
    const { env: e, calls } = env({ touch: true, canShare: true });
    expect(await shareWinners(picture({ ready: true }), e)).toBe('shared');
    expect(calls.shared.length).toBe(1);
    expect(Object.keys(calls.shared[0])).toEqual(['files']);
    const file = calls.shared[0].files![0];
    expect([file.name, file.type]).toEqual(['quarterscore-winners-abc123.png', 'image/png']);
    expect(calls.copied).toEqual([]);
    expect(calls.linkCopies).toBe(0);
  });

  it('opens the share sheet straight from the tap when the picture is ready', () => {
    const { env: e, calls } = env({ touch: true });
    shareWinners(picture({ ready: true }), e);
    expect(calls.shared.length).toBe(1);
  });

  it('waits for the picture on a phone when it is still drawing', async () => {
    const { env: e, calls } = env({ touch: true });
    expect(await shareWinners(picture(), e)).toBe('shared');
    expect(calls.shared.length).toBe(1);
  });

  it('does nothing on a phone when the share sheet is cancelled', async () => {
    const { env: e, calls } = env({ touch: true, share: 'cancel' });
    expect(await shareWinners(picture({ ready: true }), e)).toBe('dismissed');
    expect(calls.downloaded).toEqual([]);
    expect(calls.copied).toEqual([]);
  });

  it('downloads on a phone when the share sheet fails or cannot take files', async () => {
    const failed = env({ touch: true, share: 'reject' });
    expect(await shareWinners(picture({ ready: true }), failed.env)).toBe('downloaded');
    expect(failed.calls.downloaded).toEqual(['quarterscore-winners-abc123.png']);
    const noFiles = env({ touch: true, canShare: false });
    expect(await shareWinners(picture({ ready: true }), noFiles.env)).toBe('downloaded');
    expect(noFiles.calls.shared).toEqual([]);
  });

  it('downloads on a phone without a share sheet, rather than copying', async () => {
    const { env: e, calls } = env({ touch: true, share: 'none', copy: 'none' });
    expect(await shareWinners(picture(), e)).toBe('downloaded');
    expect(calls.downloaded.length).toBe(1);
  });

  it('copies the picture on desktop even when the browser supports share', async () => {
    const { env: e, calls } = env({ touch: false });
    const pic = picture();
    expect(await shareWinners(pic, e)).toBe('copied');
    expect(calls.shared).toEqual([]);
    expect(calls.copied).toEqual([pic.image]);
    expect(calls.linkCopies).toBe(0);
  });

  it('starts the clipboard write inside the tap, before the picture is drawn', () => {
    const { env: e, calls } = env({ touch: false });
    shareWinners(picture(), e);
    expect(calls.copied.length).toBe(1);
  });

  it('downloads on desktop when the clipboard refuses the picture or has no image support', async () => {
    const refused = env({ touch: false, copy: 'reject' });
    expect(await shareWinners(picture(), refused.env)).toBe('downloaded');
    const noImages = env({ touch: false, copy: 'none' });
    expect(await shareWinners(picture(), noImages.env)).toBe('downloaded');
  });

  it('reports failed when the picture cannot be drawn', async () => {
    expect(await shareWinners(picture({ broken: true }), env({ touch: false }).env)).toBe('failed');
    expect(await shareWinners(picture({ broken: true }), env({ touch: true }).env)).toBe('failed');
  });

  it('reports failed when nothing can share, copy or download', async () => {
    expect(await shareWinners(picture(), env({ touch: false, copy: 'none', download: false }).env)).toBe('failed');
  });
});

describe('shareButtonLabel', () => {
  it('reads Share winners on a finished game and Image copied after a copy', () => {
    expect(shareButtonLabel(true, false)).toBe('Share winners');
    expect(shareButtonLabel(true, true)).toBe('Image copied');
  });

  it('keeps Share invite and Link copied on other games', () => {
    expect(shareButtonLabel(false, false)).toBe('Share invite');
    expect(shareButtonLabel(false, true)).toBe('Link copied');
  });
});

describe('winnersFileName', () => {
  it('names the file after the game code', () => {
    expect(winnersFileName('ABC123')).toBe('quarterscore-winners-abc123.png');
    expect(winnersFileName('')).toBe('quarterscore-winners.png');
  });
});
