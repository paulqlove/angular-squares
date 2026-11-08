/** The server runs a board this long before kickoff. */
export const AUTO_MANAGE_LEAD_MS = 15 * 60 * 1000;

export interface AutoManageSettings {
  enabled: boolean;
  /** Also shrink a half-empty board before drawing the numbers. */
  resize: boolean;
  /** When the server runs it, in ms: kickoff minus 15 minutes. Saved from the game the host picked. */
  runAt?: number;
}

/** What the server did (or chose not to do) when the board's turn came. */
export interface AutoManageResult {
  state: 'done' | 'skipped' | 'missed';
  at: number;
  note: string;
  resizedFrom?: number;
  resizedTo?: number;
}

export function readAutoManage(value: unknown): AutoManageSettings | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  return v['enabled'] === true ? { enabled: true, resize: v['resize'] === true, ...(typeof v['runAt'] === 'number' ? { runAt: v['runAt'] } : {}) } : undefined;
}

export function readAutoManageResult(value: unknown): AutoManageResult | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (v['state'] !== 'done' && v['state'] !== 'skipped' && v['state'] !== 'missed') return undefined;
  if (typeof v['at'] !== 'number' || typeof v['note'] !== 'string') return undefined;
  return {
    state: v['state'],
    at: v['at'],
    note: v['note'].slice(0, 200),
    ...(typeof v['resizedFrom'] === 'number' ? { resizedFrom: v['resizedFrom'] } : {}),
    ...(typeof v['resizedTo'] === 'number' ? { resizedTo: v['resizedTo'] } : {})
  };
}
