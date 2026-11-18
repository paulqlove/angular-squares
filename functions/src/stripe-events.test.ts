import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Entitlement, PurchaseRecord } from "./season-pass";
import { handleStripeEvent, StripeEventDeps } from "./stripe-events";

const NOW = Date.parse("2026-11-18T15:00:00Z");
const JULY_2027 = Date.UTC(2027, 6, 1);

interface Store { purchases: Record<string, PurchaseRecord>; entitlements: Record<string, Partial<Entitlement>>; }

function fakeDeps(store: Store): StripeEventDeps {
  return {
    savePurchase: async (id, purchase) => (store.purchases[id] ??= purchase),
    findPurchaseByPaymentIntent: async (pi) => {
      const entry = Object.entries(store.purchases).find(([, p]) => p.paymentIntentId === pi);
      return entry ? { sessionId: entry[0], purchase: entry[1] } : null;
    },
    markRefunded: async (id) => { store.purchases[id] = { ...store.purchases[id], status: "refunded" }; },
    readEntitlement: async (uid) => store.entitlements[uid] ?? null,
    writeEntitlement: async (uid, entitlement) => { store.entitlements[uid] = entitlement; },
    now: () => NOW,
  };
}

const paid = (type = "checkout.session.completed", status = "paid") => ({
  id: "evt_1", type,
  data: { object: { id: "cs_1", mode: "payment", payment_status: status, client_reference_id: "host1", payment_intent: "pi_1", amount_total: 599, currency: "usd" } },
});
const refund = (refunded = true, pi = "pi_1") => ({ id: "evt_2", type: "charge.refunded", data: { object: { refunded, payment_intent: pi } } });
const empty = (): Store => ({ purchases: {}, entitlements: {} });

describe("handleStripeEvent", () => {
  it("records a paid checkout and gives the host the season", async () => {
    const store = empty();
    assert.equal(await handleStripeEvent(paid(), fakeDeps(store)), "granted");
    assert.equal(store.purchases["cs_1"].uid, "host1");
    assert.deepEqual(store.entitlements["host1"], { plan: "season", expiresAt: JULY_2027, updatedAt: NOW });
  });

  it("is safe when Stripe sends the same event twice", async () => {
    const store = empty();
    await handleStripeEvent(paid(), fakeDeps(store));
    assert.equal(await handleStripeEvent(paid(), fakeDeps(store)), "granted");
    assert.equal(Object.keys(store.purchases).length, 1);
    assert.equal(store.entitlements["host1"].expiresAt, JULY_2027);
  });

  it("waits for a delayed payment, then grants on async success", async () => {
    const store = empty();
    assert.equal(await handleStripeEvent(paid("checkout.session.completed", "unpaid"), fakeDeps(store)), "not-paid");
    assert.deepEqual(store.entitlements, {});
    assert.equal(await handleStripeEvent(paid("checkout.session.async_payment_succeeded"), fakeDeps(store)), "granted");
  });

  it("ends the pass on a full refund and keeps it ended if the paid event comes again", async () => {
    const store = empty();
    await handleStripeEvent(paid(), fakeDeps(store));
    assert.equal(await handleStripeEvent(refund(), fakeDeps(store)), "revoked");
    assert.equal(store.entitlements["host1"].expiresAt, NOW);
    assert.equal(store.purchases["cs_1"].status, "refunded");
    assert.equal(await handleStripeEvent(paid(), fakeDeps(store)), "already-refunded");
    assert.equal(store.entitlements["host1"].expiresAt, NOW);
  });

  it("leaves the pass for a partial refund, an unknown payment, or a pass from somewhere else", async () => {
    const store = empty();
    await handleStripeEvent(paid(), fakeDeps(store));
    assert.equal(await handleStripeEvent(refund(false), fakeDeps(store)), "partial-refund");
    assert.equal(await handleStripeEvent(refund(true, "pi_other"), fakeDeps(store)), "unknown-payment");
    store.entitlements["host1"] = { plan: "season", expiresAt: Date.UTC(2030, 0, 1) };
    assert.equal(await handleStripeEvent(refund(), fakeDeps(store)), "pass-moved");
    assert.equal(store.entitlements["host1"].expiresAt, Date.UTC(2030, 0, 1));
  });

  it("ignores every other event", async () => {
    const store = empty();
    assert.equal(await handleStripeEvent({ id: "evt_3", type: "payment_intent.created", data: { object: {} } }, fakeDeps(store)), "ignored");
    assert.deepEqual(store, empty());
  });
});
