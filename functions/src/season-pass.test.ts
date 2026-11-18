import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkoutRefusal, checkoutReturnUrls, giftKey, grantedEntitlement, purchaseFromSession, refundedEntitlement, seasonPassExpiry, SessionLike, isPriceId, stripeErrorSummary } from "./season-pass";

const NOV = Date.parse("2026-11-18T15:00:00Z");
const JULY_2027 = Date.UTC(2027, 6, 1);

const session = (overrides: Partial<SessionLike> = {}): SessionLike => ({
  id: "cs_test_1", mode: "payment", payment_status: "paid", client_reference_id: "uidA1",
  payment_intent: "pi_1", amount_total: 599, currency: "usd", ...overrides,
});

describe("seasonPassExpiry", () => {
  it("ends at July 1 after the season the pass is bought in", () => {
    assert.equal(seasonPassExpiry(NOV), JULY_2027);
    assert.equal(seasonPassExpiry(Date.parse("2027-03-01T00:00:00Z")), JULY_2027);
    assert.equal(seasonPassExpiry(Date.parse("2027-06-30T23:59:59Z")), JULY_2027);
  });
  it("starts a new season on July 1", () => {
    assert.equal(seasonPassExpiry(Date.parse("2027-07-01T00:00:00Z")), Date.UTC(2028, 6, 1));
  });
});

describe("checkoutReturnUrls", () => {
  it("returns to the site and previews the buyer came from", () => {
    assert.equal(checkoutReturnUrls("https://quarterscore.com").success, "https://quarterscore.com/dashboard?pass=success");
    assert.equal(checkoutReturnUrls("https://squares-4e4f7--pr410-abc.web.app").cancel, "https://squares-4e4f7--pr410-abc.web.app/dashboard?pass=cancel");
    assert.equal(checkoutReturnUrls("http://localhost:4200").success, "http://localhost:4200/dashboard?pass=success");
  });
  it("falls back to quarterscore.com for any other origin", () => {
    for (const origin of ["https://evil.example", "https://squares-4e4f7--x.web.app.evil.example", undefined, 42]) {
      assert.equal(checkoutReturnUrls(origin).success, "https://quarterscore.com/dashboard?pass=success");
    }
  });
});

describe("purchaseFromSession", () => {
  it("records a paid session for its host with a season end date", () => {
    assert.deepEqual(purchaseFromSession(session(), NOV), {
      uid: "uidA1", amount: 599, currency: "usd", paymentIntentId: "pi_1", createdAt: NOV, expiresAt: JULY_2027, status: "paid",
    });
  });
  it("reads the host from metadata and an expanded payment intent", () => {
    const out = purchaseFromSession(session({ client_reference_id: null, metadata: { uid: "uidB2" }, payment_intent: { id: "pi_2" } }), NOV);
    assert.equal(out?.uid, "uidB2");
    assert.equal(out?.paymentIntentId, "pi_2");
  });
  it("grants nothing for unpaid, non-payment or hostless sessions", () => {
    assert.equal(purchaseFromSession(session({ payment_status: "unpaid" }), NOV), null);
    assert.equal(purchaseFromSession(session({ mode: "subscription" }), NOV), null);
    assert.equal(purchaseFromSession(session({ client_reference_id: null }), NOV), null);
    assert.equal(purchaseFromSession(session({ client_reference_id: "a/b" }), NOV), null);
    assert.equal(purchaseFromSession(session({ payment_intent: null }), NOV), null);
  });
});

describe("grantedEntitlement and refundedEntitlement", () => {
  const purchase = purchaseFromSession(session(), NOV)!;
  it("grants the season, keeping a later pass the host already holds", () => {
    assert.deepEqual(grantedEntitlement(null, purchase, NOV), { plan: "season", expiresAt: JULY_2027, updatedAt: NOV });
    const later = Date.UTC(2030, 0, 1);
    assert.equal(grantedEntitlement({ expiresAt: later }, purchase, NOV).expiresAt, later);
    assert.equal(grantedEntitlement({ expiresAt: NOV - 1 }, purchase, NOV).expiresAt, JULY_2027);
  });
  it("ends the pass on a refund only when it still comes from this purchase", () => {
    const at = NOV + 1000;
    assert.deepEqual(refundedEntitlement({ expiresAt: JULY_2027 }, purchase, at), { plan: "season", expiresAt: at, updatedAt: at });
    assert.equal(refundedEntitlement({ expiresAt: Date.UTC(2030, 0, 1) }, purchase, at), null);
    assert.equal(refundedEntitlement(null, purchase, at), null);
  });
});

describe("checkoutRefusal and giftKey", () => {
  it("lets a signed-in host without a running pass buy", () => {
    assert.equal(checkoutRefusal({ uid: "host1", provider: "password" }, 0, NOV), null);
    assert.equal(checkoutRefusal({ uid: "host1", provider: "google.com" }, NOV - 1, NOV), null);
  });
  it("refuses guests, the signed out and hosts who already have a pass", () => {
    assert.match(checkoutRefusal({}, 0, NOV) ?? "", /Sign in/);
    assert.match(checkoutRefusal({ uid: "guest1", provider: "anonymous" }, 0, NOV) ?? "", /email/);
    assert.match(checkoutRefusal({ uid: "host1", provider: "password" }, JULY_2027, NOV) ?? "", /already/);
  });
  it("keys gifts the way the app does", () => {
    assert.equal(giftKey("Paul.Q@Mail.Example.com"), "paul,q@mail,example,com");
  });
});

describe("stripeErrorSummary", () => {
  it("puts Stripe's error fields in the log text", () => {
    const error = Object.assign(new Error("No such price: 'price_123'"), {
      type: "StripeInvalidRequestError", code: "resource_missing", param: "line_items[0][price]", statusCode: 400, requestId: "req_abc",
    });
    assert.equal(
      stripeErrorSummary(error),
      "type=StripeInvalidRequestError code=resource_missing param=line_items[0][price] statusCode=400 requestId=req_abc message=No such price: 'price_123'",
    );
  });
  it("masks anything shaped like a key and handles non-errors", () => {
    assert.equal(stripeErrorSummary(new Error("Invalid API Key provided: sk_test_abc123")), "message=Invalid API Key provided: sk_***");
    assert.equal(stripeErrorSummary("boom"), "message=boom");
    assert.equal(stripeErrorSummary(undefined), "message=undefined");
  });
});

describe("isPriceId", () => {
  it("accepts a Stripe price id and nothing else", () => {
    assert.equal(isPriceId("price_1AbC23"), true);
    assert.equal(isPriceId("whsec_abc123"), false);
    assert.equal(isPriceId("sk_test_abc123"), false);
    assert.equal(isPriceId(""), false);
    assert.equal(isPriceId(undefined), false);
  });
});
