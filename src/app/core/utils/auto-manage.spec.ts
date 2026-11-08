import { readAutoManage, readAutoManageResult } from './auto-manage';

describe('auto-manage readers', () => {
  it('reads settings only when enabled', () => {
    expect(readAutoManage({ enabled: true, resize: true })).toEqual({ enabled: true, resize: true });
    expect(readAutoManage({ enabled: true })).toEqual({ enabled: true, resize: false });
    expect(readAutoManage({ enabled: false })).toBeUndefined();
    expect(readAutoManage(null)).toBeUndefined();
  });

  it('reads a result and drops junk', () => {
    expect(readAutoManageResult({ state: 'done', at: 5, note: 'ok', resizedFrom: 100, resizedTo: 50 }))
      .toEqual({ state: 'done', at: 5, note: 'ok', resizedFrom: 100, resizedTo: 50 });
    expect(readAutoManageResult({ state: 'nope', at: 5, note: 'x' })).toBeUndefined();
    expect(readAutoManageResult({ state: 'done', at: 'x', note: 'x' })).toBeUndefined();
  });
});
