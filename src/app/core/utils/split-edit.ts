import { DEFAULT_SPLIT, QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../plans';

/** A quarter split as the host edits it, in percent (20 = 20%). */
export type SplitPercents = { [k in keyof QuarterSplit]: number };

export const SPLIT_QUARTERS: { key: keyof QuarterSplit; label: string }[] = [
  { key: 'q1', label: 'Q1' }, { key: 'q2', label: 'Q2' }, { key: 'q3', label: 'Q3' }, { key: 'q4', label: 'Q4' }
];

/** The saved split (tenths of a percent) as percents to edit; the classic split when none is saved. */
export function splitPercents(split: QuarterSplit | null | undefined): SplitPercents {
  const s = isValidSplit(split) ? split : DEFAULT_SPLIT;
  return { q1: s.q1 / 10, q2: s.q2 / 10, q3: s.q3 / 10, q4: s.q4 / 10 };
}

/** The edited split in tenths of a percent, or null if any quarter has more than one decimal. */
export function splitTenths(pct: SplitPercents): QuarterSplit | null {
  const t = (v: number) => Math.round(Number(v) * 10);
  const ok = SPLIT_QUARTERS.every(q => Number.isFinite(Number(pct[q.key])) && Math.abs(Number(pct[q.key]) * 10 - t(pct[q.key])) < 1e-6);
  return ok ? { q1: t(pct.q1), q2: t(pct.q2), q3: t(pct.q3), q4: t(pct.q4) } : null;
}

/** What Save stores: the split, or null for the classic split. */
export function splitToSave(pct: SplitPercents): QuarterSplit | null {
  const s = splitTenths(pct);
  const isDefault = s && s.q1 === DEFAULT_SPLIT.q1 && s.q2 === DEFAULT_SPLIT.q2 && s.q3 === DEFAULT_SPLIT.q3 && s.q4 === DEFAULT_SPLIT.q4;
  return isDefault ? null : s;
}

/** The preset id the edited split matches, or 'custom'. */
export function splitPresetId(pct: SplitPercents): string {
  const t = splitTenths(pct);
  return SPLIT_PRESETS.find(p => t && p.split.q1 === t.q1 && p.split.q2 === t.q2 && p.split.q3 === t.q3 && p.split.q4 === t.q4)?.id ?? 'custom';
}

/** "20 / 20 / 20 / 40" */
export function splitLabel(pct: SplitPercents): string {
  return [pct.q1, pct.q2, pct.q3, pct.q4].map(v => (Math.round(Number(v) * 10) / 10).toString()).join(' / ');
}

/** "15%": what is still needed to reach 100%. */
export function splitRemaining(pct: SplitPercents): string {
  const total = SPLIT_QUARTERS.reduce((sum, q) => sum + (Number(pct[q.key]) || 0), 0);
  return (Math.round((100 - total) * 10) / 10).toString() + '%';
}
