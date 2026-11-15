import { parseGroups } from './game-groups';
import {
  cleanCoHostEmail, coHostLabel, coHostPlan, coHostPlanLines, coHostSaveLabel, gamesWithCoHost, groupCoHostUpdates, hasCoHost, looksLikeEmail,
  removeCoHostQuestion
} from './group-cohost';

const CHURCH = 'ChurchGroupKey000001';
const WORK = 'WorkGroupKey00000001';

describe('group co-host', () => {
  const games = [
    { id: 'a', name: 'Week 12', openListId: CHURCH },
    { id: 'b', name: 'Church Overflow', openListId: CHURCH, managerId: 'sam', managerName: 'Sam Lee' },
    { id: 'c', name: 'Old', openListId: CHURCH, managerEmail: 'DANA@email.com' },
    { id: 'd', name: 'Office', openListId: WORK }
  ];

  it('reads a group\'s co-host from the owner-only list and skips a bad one', () => {
    const raw = { [CHURCH]: { name: 'Church', createdAt: 1, coHost: { email: 'old@email.com' } }, [WORK]: { name: 'Work', createdAt: 2 } };
    const groups = parseGroups(raw, { [CHURCH]: { email: 'dana@email.com' }, [WORK]: { email: 42 } });
    expect(groups[0].coHost).toEqual({ email: 'dana@email.com' });
    expect('coHost' in groups[1]).toBe(false);
    expect(parseGroups(raw).some(g => 'coHost' in g)).toBe(false);
  });

  it('cleans and checks emails', () => {
    expect(cleanCoHostEmail('  dana@email.com ')).toBe('dana@email.com');
    expect(looksLikeEmail('dana@email.com')).toBe(true);
    expect(looksLikeEmail('dana@email')).toBe(false);
    expect(looksLikeEmail('dana email.com')).toBe(false);
  });

  it('a game has a co-host picked from players or typed by email', () => {
    expect(hasCoHost(games[0])).toBe(false);
    expect(hasCoHost(games[1])).toBe(true);
    expect(hasCoHost(games[2])).toBe(true);
    expect(coHostLabel(games[1])).toBe('Sam Lee');
    expect(coHostLabel(games[2])).toBe('DANA@email.com');
  });

  it('plans who gets the co-host: only the group\'s games with none', () => {
    const plan = coHostPlan(games, CHURCH, 'dana@email.com');
    expect(plan.adds.map(g => g.id)).toEqual(['a']);
    expect(plan.keeps.map(g => g.id)).toEqual(['b']);
    expect(coHostPlanLines(plan, 'dana@email.com')).toEqual(['1 game has no co-host and gets dana@email.com.', 'Church Overflow keeps Sam Lee.']);
    expect(coHostSaveLabel(plan)).toBe('Save and add to 1');
    expect(coHostSaveLabel(coHostPlan([games[1]], CHURCH, 'x@y.co'))).toBe('Save');
  });

  it('says how many keep their own when several do', () => {
    const plan = coHostPlan([...games, { id: 'e', name: 'E', openListId: CHURCH, managerId: 'z' }, { id: 'f', name: 'F', openListId: CHURCH }], CHURCH, 'lee@email.com');
    expect(coHostPlanLines(plan, 'lee@email.com')).toEqual(['2 games have no co-host and get lee@email.com.', '3 games keep their own co-host.']);
  });

  it('finds the games a remove may clear, by email, ignoring case', () => {
    expect(gamesWithCoHost(games, CHURCH, 'dana@email.com').map(g => g.id)).toEqual(['c']);
    expect(removeCoHostQuestion('dana@email.com', 'Church', 2).title).toBe('Also remove dana@email.com from 2 Church games?');
  });

  it('writes the group and its games in one update', () => {
    expect(groupCoHostUpdates('o', CHURCH, { email: 'dana@email.com' }, { addTo: ['a'], clearFrom: ['c'] })).toEqual({
      [`groupCoHosts/o/${CHURCH}`]: { email: 'dana@email.com' },
      'games/a/managerId': '', 'games/a/managerEmail': 'dana@email.com', 'games/a/managerName': '',
      'games/c/managerId': '', 'games/c/managerEmail': '', 'games/c/managerName': ''
    });
    expect(groupCoHostUpdates('o', CHURCH, null, { addTo: [], clearFrom: [] })).toEqual({ [`groupCoHosts/o/${CHURCH}`]: null });
  });
});
