import { richText } from './rich-text';

describe('richText', () => {
  it('escapes HTML in the copy', () => {
    expect(richText('5 < 7 & <b>x</b>')).toBe('5 &lt; 7 &amp; &lt;b&gt;x&lt;/b&gt;');
  });

  it('bolds button names', () => {
    expect(richText('Choose **Present on a TV**.')).toBe('Choose <strong>Present on a TV</strong>.');
  });

  it('links a site path', () => {
    expect(richText('[Best numbers](/best-squares-numbers) has the table.')).toBe(
      '<a href="/best-squares-numbers" class="font-medium text-qs-accent underline underline-offset-2">Best numbers</a> has the table.'
    );
  });

  it('leaves links to other sites as plain text', () => {
    expect(richText('[site](https://example.com)')).toBe('[site](https://example.com)');
    expect(richText('[x](javascript:alert(1))')).toBe('[x](javascript:alert(1))');
    expect(richText('[x](//evil)')).toBe('[x](//evil)');
  });

  it('does not let a link label carry markup', () => {
    expect(richText('[<img>](/faq)')).toBe('<a href="/faq" class="font-medium text-qs-accent underline underline-offset-2">&lt;img&gt;</a>');
  });
});
