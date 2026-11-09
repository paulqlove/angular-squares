import { buildInitials } from './initials.utils';

describe('buildInitials', () => {
  it('uses first and last initials, or two letters for one word', () => {
    const m = buildInitials(['Mike Smith', 'Bo']);
    expect(m.get('Mike Smith')).toBe('MS');
    expect(m.get('Bo')).toBe('BO');
  });

  it('gives Gene Shatlock and Gene Shatlock Jr. different labels', () => {
    const m = buildInitials(['Gene Shatlock Jr.', 'Gene Shatlock']);
    expect(m.get('Gene Shatlock')).toBe('GS');
    expect(m.get('Gene Shatlock Jr.')).toBe('GSJ');
  });

  it('separates different people who share initials', () => {
    const m = buildInitials(['Mike Smith', 'Mary Stone']);
    expect(new Set(m.values()).size).toBe(2);
  });

  it('never repeats a label, even for identical-looking names', () => {
    const m = buildInitials(['Al Bo', 'Al Bo Jr', 'Alan Bo', 'Alex Bo', 'Al B']);
    expect(new Set(m.values()).size).toBe(m.size);
  });
});
