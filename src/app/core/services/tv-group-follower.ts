import { TvLink } from '../utils/game-data';
import { followedBoards, followedOwner } from '../utils/tv-follow';

/** The database reads the follower needs: a live watch on a path, and a one-time read. */
export interface FollowerReads {
  watch: (path: string, next: (value: unknown) => void) => () => void;
  read: (path: string) => Promise<unknown>;
}

/**
 * Behind a TV link that follows a group: keeps one watch on that group's More-tab list (`openLists/{group}`, readable
 * by key) and sends the link on with the group's current boards. Links without a group pass through unchanged.
 */
export class TvGroupFollower {
  private current: TvLink | null = null;
  private list: Record<string, unknown> | null = null;
  private owner: string | null = null;
  private watching: string | null = null;
  private listOff: (() => void) | null = null;

  public constructor(
    private readonly reads: FollowerReads,
    private readonly send: (link: TvLink | null) => void
  ) {}

  /** The TV link changed (or turned off). Starts, swaps or stops the group watch to match. */
  public link(link: TvLink | null): void {
    this.current = link;
    const group = link?.group ?? null;
    if (group !== this.watching) {
      this.stop();
      if (group && link) this.watch(group, link.boards[0]);
    }
    this.emit();
  }

  public stop(): void {
    this.listOff?.();
    this.listOff = null;
    this.list = null;
    this.owner = null;
    this.watching = null;
  }

  private watch(group: string, firstBoard: string): void {
    this.watching = group;
    void this.boardOwner(firstBoard).then(owner => {
      if (this.watching !== group) return;
      this.owner = owner;
      this.emit();
    });
    this.listOff = this.reads.watch(`openLists/${group}`, value => {
      this.list = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
      this.emit();
    });
  }

  private emit(): void {
    const link = this.current;
    if (!link?.group) {
      this.send(link);
      return;
    }
    const owner = followedOwner(link.boards, this.list) ?? this.owner;
    this.send({ ...link, boards: followedBoards(link.boards, this.list, owner) });
  }

  /** A board's owner (public on the board). Used when none of the saved boards is in the group any more. */
  private async boardOwner(boardId: string): Promise<string | null> {
    try {
      const value = await this.reads.read(`games/${boardId}/ownerId`);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }
}
