/** The winners picture shown in the Share winners dialog: drawing, ready as an object URL, or failed. Plain TypeScript so it can be tested directly. */

export type WinnersPreviewState = { status: 'drawing' } | { status: 'ready'; url: string } | { status: 'failed' };

/** Makes and frees the object URL the picture is shown from. */
export interface ObjectUrls {
  create: (picture: Blob) => string;
  revoke: (url: string) => void;
}

/**
 * Follows one picture at a time. A draw that lands after a newer one started, or after clear(), is ignored.
 * After a failed draw `image` is null again, so the next Share winners tap draws again.
 */
export class WinnersPreview {
  private current: Promise<Blob> | null = null;
  private finished: Blob | null = null;
  private url: string | null = null;

  constructor(
    private readonly urls: ObjectUrls,
    private readonly show: (state: WinnersPreviewState) => void
  ) {}

  /** The picture being drawn, or null when there is none (or the last one failed). */
  get image(): Promise<Blob> | null {
    return this.current;
  }

  /** The finished picture, once it's ready. */
  get ready(): Blob | null {
    return this.finished;
  }

  /** Shows the drawing placeholder, then the picture once it's ready, or the failed message. */
  track(image: Promise<Blob>): void {
    this.clear();
    this.current = image;
    this.show({ status: 'drawing' });
    image.then(
      picture => this.landed(image, picture),
      () => this.failed(image)
    );
  }

  /** Forgets the picture and frees its URL when the dialog closes. The shown state stays as it is, so the picture doesn't flicker during the close fade; the next track() resets it. */
  clear(): void {
    this.current = null;
    this.finished = null;
    if (this.url) this.urls.revoke(this.url);
    this.url = null;
  }

  private failed(image: Promise<Blob>): void {
    if (this.current !== image) return;
    this.current = null;
    this.show({ status: 'failed' });
  }

  private landed(image: Promise<Blob>, picture: Blob): void {
    if (this.current !== image) return;
    this.finished = picture;
    this.url = this.urls.create(picture);
    this.show({ status: 'ready', url: this.url });
  }
}

/** The browser's object URLs. */
export function browserObjectUrls(): ObjectUrls {
  return {
    create: picture => URL.createObjectURL(picture),
    revoke: url => URL.revokeObjectURL(url)
  };
}
