import rules from '../../../database.rules.json';

describe('database rules for the owner allowlist and public fields', () => {
  const root = (rules as { rules: Record<string, any> }).rules;

  it('lets a client read only their own owners entry and blocks client writes', () => {
    const entry = root['owners']['$uid'];
    expect(entry['.read']).toBe('auth != null && auth.uid == $uid');
    expect(entry['.write']).toBe(false);
    expect(entry['.validate']).toBe('newData.isBoolean()');
  });

  it('limits house rules to 500 characters of text', () => {
    expect(root['games']['$gameId']['houseRules']['.validate'])
      .toBe('newData.isString() && newData.val().length <= 500');
  });

  it('stores terms acceptance as a timestamp and version on the user record', () => {
    const acceptance = root['users']['$userId']['tosAcceptance'];
    expect(acceptance['acceptedAt']['.validate']).toBe('newData.isNumber()');
    expect(acceptance['version']['.validate']).toContain('newData.isString()');
    expect(acceptance['$other']['.validate']).toBe(false);
  });
});
