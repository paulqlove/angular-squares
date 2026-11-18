import { isStripePage } from './checkout.service';

describe('isStripePage', () => {
  it('accepts Stripe-hosted https pages', () => {
    expect(isStripePage('https://checkout.stripe.com/c/pay/cs_test_123')).toBe(true);
    expect(isStripePage('https://pay.stripe.com/x')).toBe(true);
  });

  it('refuses anything else, so the site never leaves for a page Stripe did not make', () => {
    for (const url of ['http://checkout.stripe.com/x', 'https://checkout.stripe.com.evil.example/x', 'https://evilstripe.com/x', 'javascript:alert(1)', 'not a url', null, 42]) {
      expect(isStripePage(url)).toBe(false);
    }
  });
});
