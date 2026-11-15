import { ObjectUrls, WinnersPreview, WinnersPreviewState } from './winners-preview';

describe('WinnersPreview', () => {
  const png = () => new Blob(['png'], { type: 'image/png' });
  const settle = () => new Promise(resolve => setTimeout(resolve));

  let states: WinnersPreviewState[];
  let made: string[];
  let revoked: string[];
  let preview: WinnersPreview;

  function deferred() {
    let resolve!: (picture: Blob) => void;
    let reject!: (error: Error) => void;
    const image = new Promise<Blob>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { image, resolve, reject };
  }

  beforeEach(() => {
    states = [];
    made = [];
    revoked = [];
    const urls: ObjectUrls = {
      create: () => {
        const url = `blob:test/${made.length + 1}`;
        made.push(url);
        return url;
      },
      revoke: url => revoked.push(url)
    };
    preview = new WinnersPreview(urls, state => states.push(state));
  });

  it('shows the drawing placeholder while the picture draws', () => {
    preview.track(deferred().image);
    expect(states).toEqual([{ status: 'drawing' }]);
    expect(preview.ready).toBeNull();
    expect(made).toEqual([]);
  });

  it('shows the picture from an object URL once it is ready, and keeps the finished picture for sharing', async () => {
    const draw = deferred();
    const picture = png();
    preview.track(draw.image);
    draw.resolve(picture);
    await settle();
    expect(states.at(-1)).toEqual({ status: 'ready', url: 'blob:test/1' });
    expect(preview.ready).toBe(picture);
    expect(preview.image).toBe(draw.image);
  });

  it('shows the failed message when the draw fails, and forgets the picture so the next tap draws again', async () => {
    const draw = deferred();
    preview.track(draw.image);
    draw.reject(new Error('canvas'));
    await settle();
    expect(states.at(-1)).toEqual({ status: 'failed' });
    expect(preview.image).toBeNull();
    expect(made).toEqual([]);
  });

  it('goes back to drawing on a retry after a failure', async () => {
    const first = deferred();
    preview.track(first.image);
    first.reject(new Error('canvas'));
    await settle();
    const retry = deferred();
    preview.track(retry.image);
    expect(states.at(-1)).toEqual({ status: 'drawing' });
    retry.resolve(png());
    await settle();
    expect(states.at(-1)).toEqual({ status: 'ready', url: 'blob:test/1' });
  });

  it('revokes the URL when cleared', async () => {
    const draw = deferred();
    preview.track(draw.image);
    draw.resolve(png());
    await settle();
    preview.clear();
    expect(revoked).toEqual(['blob:test/1']);
    expect(preview.image).toBeNull();
    expect(preview.ready).toBeNull();
    preview.clear();
    expect(revoked).toEqual(['blob:test/1']);
  });

  it('revokes the old URL when a new picture is tracked', async () => {
    const first = deferred();
    preview.track(first.image);
    first.resolve(png());
    await settle();
    preview.track(deferred().image);
    expect(revoked).toEqual(['blob:test/1']);
  });

  it('ignores a picture that lands after the dialog closed, so no URL is left behind', async () => {
    const draw = deferred();
    preview.track(draw.image);
    preview.clear();
    draw.resolve(png());
    await settle();
    expect(made).toEqual([]);
    expect(states).toEqual([{ status: 'drawing' }]);
  });

  it('ignores an older draw that lands after a newer one started', async () => {
    const older = deferred();
    preview.track(older.image);
    const newer = deferred();
    preview.track(newer.image);
    older.resolve(png());
    older.reject(new Error('ignored'));
    await settle();
    expect(made).toEqual([]);
    expect(states.at(-1)).toEqual({ status: 'drawing' });
  });
});
