import { TvLink } from '../utils/game-data';
import { followedBoards } from '../utils/tv-follow';

/** A live watch on a database path. Returns the function that stops it. */
export type WatchPath = (path: string, next: (value: unknown) => void) => () => void;

/**
 * Behind a TV link that follows a group: keeps one watch on that group's More-tab list (`openLists/{group}`, readable
 * by key) and sends the link on with the group's current boards. Links without a group pass through unchanged.
 */
export class TvGroupFollower {
  private current: TvLink | null = null;
  private list: Record<string, unknown> | null = null;
  private watching: string | null = null;
  private listOff: (() => void) | null = null;

  public constructor(
    private readonly watch: WatchPath,
    private readonly send: (link: TvLink | null) => void
  ) {}

  /** The TV link changed (or turned off). Starts, swaps or stops the group watch to match, then sends the link on. */
  public link(link: TvLink | null): void {
    this.current = link;
    const group = link?.follow?.group ?? null;
    if (group !== this.watching) {
      this.stop();
      if (group) this.start(group);
    }
    this.emit();
  }

  public stop(): void {
    this.listOff?.();
    this.listOff = null;
    this.list = null;
    this.watching = null;
  }

  private start(group: string): void {
    this.watching = group;
    this.listOff = this.watch(`openLists/${group}`, value => {
      if (this.watching !== group) return;
      this.list = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
      this.emit();
    });
  }

  private emit(): void {
    const link = this.current;
    this.send(link?.follow ? { ...link, boards: followedBoards(link.boards, this.list, link.follow.owner) } : link);
  }
}
