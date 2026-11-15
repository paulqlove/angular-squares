/** The phone host bar's one game-day button: lock (which draws), draw a locked board's missing numbers, then unlock. */
export type HostNextStep = 'lock' | 'draw' | 'unlock';

export function hostNextStep(isLocked: boolean, isRandomized: boolean): HostNextStep {
  if (!isLocked) return 'lock';
  return isRandomized ? 'unlock' : 'draw';
}
