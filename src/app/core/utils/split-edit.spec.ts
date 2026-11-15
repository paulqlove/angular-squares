import { splitLabel, splitPercents, splitPresetId, splitRemaining, splitTenths, splitToSave } from './split-edit';

describe('split editing', () => {
  it('opens on the saved split, or the classic split when none is saved', () => {
    expect(splitPercents({ q1: 250, q2: 250, q3: 250, q4: 250 })).toEqual({ q1: 25, q2: 25, q3: 25, q4: 25 });
    expect(splitPercents(null)).toEqual({ q1: 20, q2: 20, q3: 20, q4: 40 });
  });

  it('turns percents into tenths, and refuses more than one decimal', () => {
    expect(splitTenths({ q1: 12.5, q2: 27.5, q3: 20, q4: 40 })).toEqual({ q1: 125, q2: 275, q3: 200, q4: 400 });
    expect(splitTenths({ q1: 12.55, q2: 27.45, q3: 20, q4: 40 })).toBeNull();
  });

  it('saves the classic split as null and anything else as tenths', () => {
    expect(splitToSave({ q1: 20, q2: 20, q3: 20, q4: 40 })).toBeNull();
    expect(splitToSave({ q1: 25, q2: 25, q3: 25, q4: 25 })).toEqual({ q1: 250, q2: 250, q3: 250, q4: 250 });
  });

  it('names the matching preset, the label and what is left', () => {
    expect(splitPresetId({ q1: 25, q2: 25, q3: 25, q4: 25 })).toBe('even');
    expect(splitPresetId({ q1: 15, q2: 15, q3: 30, q4: 40 })).toBe('custom');
    expect(splitLabel({ q1: 20, q2: 20, q3: 20, q4: 25 })).toBe('20 / 20 / 20 / 25');
    expect(splitRemaining({ q1: 20, q2: 20, q3: 20, q4: 25 })).toBe('15%');
  });
});
