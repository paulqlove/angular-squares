import { TvLink } from '../utils/game-data';
import { FollowerReads, TvGroupFollower } from './tv-group-follower';

const listeners = new Map<string, (value: unknown) => void>();
const unsubscribed: string[] = [];
const owners: Record<string, string> = { AAAAA1: 'host', BBBBB2: 'host' };
const reads: FollowerReads = {
  watch: (path, next) => {
    listeners.set(path, next);
    return () => unsubscribed.push(path);
  },
  read: async path => owners[path.split('/')[1]] ?? null
};

const WORK = 'WorkGroupKey00000001';
const HOME = 'HomeGroupKey00000001';
const push = (path: string, value: unknown): void => listeners.get(path)?.(value);
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

describe('TvGroupFollower', () => {
  let sent: (TvLink | null)[];
  let follower: TvGroupFollower;

  beforeEach(() => {
    listeners.clear();
    unsubscribed.length = 0;
    sent = [];
    follower = new TvGroupFollower(reads, link => sent.push(link));
  });

  it('passes a link without a group through and watches nothing', () => {
    follower.link({ boards: ['AAAAA1'], interval: 10 });
    expect(sent.at(-1)).toEqual({ boards: ['AAAAA1'], interval: 10 });
    expect(listeners.size).toBe(0);
  });

  it('shows boards added to the followed group', async () => {
    follower.link({ boards: ['AAAAA1', 'BBBBB2'], interval: 20, group: WORK });
    push(`openLists/${WORK}`, { AAAAA1: 'host', BBBBB2: 'host', CCCCC3: 'host' });
    await flush();
    expect(sent.at(-1)?.boards).toEqual(['AAAAA1', 'BBBBB2', 'CCCCC3']);
  });

  it('finds the owner from a saved board when none of the saved boards is left in the group', async () => {
    follower.link({ boards: ['AAAAA1'], interval: 20, group: WORK });
    await flush();
    push(`openLists/${WORK}`, { DDDDD4: 'host', EEEEE5: 'stranger' });
    expect(sent.at(-1)?.boards).toEqual(['DDDDD4']);
  });

  it('moves the watch when the group changes, and stops it when the link turns off', () => {
    follower.link({ boards: ['AAAAA1'], interval: 20, group: WORK });
    follower.link({ boards: ['BBBBB2'], interval: 20, group: HOME });
    expect(unsubscribed).toEqual([`openLists/${WORK}`]);
    follower.link(null);
    expect(unsubscribed).toEqual([`openLists/${WORK}`, `openLists/${HOME}`]);
    expect(sent.at(-1)).toBeNull();
  });
});
