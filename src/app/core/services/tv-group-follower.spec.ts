import { TvLink } from '../utils/game-data';
import { TvGroupFollower, WatchPath } from './tv-group-follower';

const WORK = 'WorkGroupKey00000001';
const HOME = 'HomeGroupKey00000001';

describe('TvGroupFollower', () => {
  let listeners: Map<string, (value: unknown) => void>;
  let stopped: string[];
  let sent: (TvLink | null)[];
  let follower: TvGroupFollower;
  const push = (path: string, value: unknown): void => listeners.get(path)?.(value);
  const following = (group: string, boards: string[]): TvLink => ({ boards, interval: 20, follow: { group, owner: 'host' } });

  beforeEach(() => {
    listeners = new Map();
    stopped = [];
    sent = [];
    const watch: WatchPath = (path, next) => {
      listeners.set(path, next);
      return () => void stopped.push(path);
    };
    follower = new TvGroupFollower(watch, link => sent.push(link));
  });

  it('passes a link without a group through and watches nothing', () => {
    follower.link({ boards: ['AAAAA1'], interval: 10 });
    expect(sent.at(-1)).toEqual({ boards: ['AAAAA1'], interval: 10 });
    expect(listeners.size).toBe(0);
  });

  it('shows the saved boards until the list arrives, then the group as it is now', () => {
    follower.link(following(WORK, ['AAAAA1', 'BBBBB2']));
    expect(sent.at(-1)?.boards).toEqual(['AAAAA1', 'BBBBB2']);
    push(`openLists/${WORK}`, { AAAAA1: 'host', CCCCC3: 'host', ZZZZZ9: 'stranger' });
    expect(sent.at(-1)?.boards).toEqual(['AAAAA1', 'CCCCC3']);
  });

  it('keeps the saved boards when the list cannot be read', () => {
    follower.link(following(WORK, ['AAAAA1']));
    push(`openLists/${WORK}`, null);
    expect(sent.at(-1)?.boards).toEqual(['AAAAA1']);
  });

  it('keeps one watch while only the boards or time change', () => {
    follower.link(following(WORK, ['AAAAA1']));
    follower.link({ ...following(WORK, ['AAAAA1']), interval: 60 });
    expect(stopped).toEqual([]);
    expect(sent.at(-1)?.interval).toBe(60);
  });

  it('moves the watch when the group changes, and stops it when the link turns off', () => {
    follower.link(following(WORK, ['AAAAA1']));
    follower.link(following(HOME, ['BBBBB2']));
    expect(stopped).toEqual([`openLists/${WORK}`]);
    push(`openLists/${HOME}`, { BBBBB2: 'host' });
    follower.link(null);
    expect(stopped).toEqual([`openLists/${WORK}`, `openLists/${HOME}`]);
    expect(sent.at(-1)).toBeNull();
  });

  it('sends nothing more after it stops, even if the old list fires', () => {
    follower.link(following(WORK, ['AAAAA1']));
    const fire = listeners.get(`openLists/${WORK}`);
    follower.link(null);
    const count = sent.length;
    fire?.({ AAAAA1: 'host', DDDDD4: 'host' });
    expect(sent.length).toBe(count);
  });
});
