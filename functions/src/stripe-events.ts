import { Entitlement, grantedEntitlement, PurchaseRecord, purchaseFromSession, refundedEntitlement, SessionLike } from "./season-pass";

/**
 * What the Stripe webhook does with each event, with the database passed in so it is tested without Firebase.
 * Stripe can send an event more than once and out of order, so every step is safe to repeat.
 */

/** The database steps the handler needs; index.ts wires them to the Realtime Database. */
export interface StripeEventDeps {
  /** Saves purchases/{sessionId} if it is new and returns what is stored there now. */
  savePurchase: (sessionId: string, purchase: PurchaseRecord) => Promise<PurchaseRecord>;
  findPurchaseByPaymentIntent: (paymentIntentId: string) => Promise<{ sessionId: string; purchase: PurchaseRecord } | null>;
  markRefunded: (sessionId: string) => Promise<void>;
  readEntitlement: (uid: string) => Promise<Partial<Entitlement> | null>;
  writeEntitlement: (uid: string, entitlement: Entitlement) => Promise<void>;
  now: () => number;
}

/** The fields of a Stripe event the handler reads. */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: unknown };
}

interface ChargeLike {
  refunded?: boolean | null;
  payment_intent?: string | { id: string } | null;
}

/** Why an event changed nothing, or "granted" / "revoked"; logged by the webhook. */
export type StripeEventResult = "granted" | "revoked" | "ignored" | "not-paid" | "already-refunded" | "unknown-payment" | "partial-refund" | "pass-moved";

const GRANT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export async function handleStripeEvent(event: StripeEventLike, deps: StripeEventDeps): Promise<StripeEventResult> {
  if (GRANT_EVENTS.has(event.type)) return grantPass(event.data.object as SessionLike, deps);
  if (event.type === "charge.refunded") return revokePass(event.data.object as ChargeLike, deps);
  return "ignored";
}

/** A paid session: record it once, then give the host the pass (a repeat writes the same pass again). */
async function grantPass(session: SessionLike, deps: StripeEventDeps): Promise<StripeEventResult> {
  const now = deps.now();
  const purchase = purchaseFromSession(session, now);
  if (!purchase) return "not-paid";
  const stored = await deps.savePurchase(session.id, purchase);
  if (stored.status === "refunded") return "already-refunded";
  const current = await deps.readEntitlement(stored.uid);
  await deps.writeEntitlement(stored.uid, grantedEntitlement(current, stored, now));
  return "granted";
}

/** A full refund ends the pass it bought; a partial refund (a goodwill credit) leaves the pass alone. */
async function revokePass(charge: ChargeLike, deps: StripeEventDeps): Promise<StripeEventResult> {
  if (charge.refunded !== true) return "partial-refund";
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  const found = paymentIntentId ? await deps.findPurchaseByPaymentIntent(paymentIntentId) : null;
  if (!found) return "unknown-payment";
  await deps.markRefunded(found.sessionId);
  const now = deps.now();
  const ended = refundedEntitlement(await deps.readEntitlement(found.purchase.uid), found.purchase, now);
  if (!ended) return "pass-moved";
  await deps.writeEntitlement(found.purchase.uid, ended);
  return "revoked";
}
