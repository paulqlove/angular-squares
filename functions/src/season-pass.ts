import { ALLOWED_ORIGINS, SITE } from "./signin-email";

/**
 * The Season Pass sale: the pure rules the Stripe functions share, with no Firebase or Stripe imports,
 * so they are unit-tested directly. Paul's decisions (Nov 17, 2026): one-time $5.99 with tax included
 * (set on the Stripe price), Managed Payments, and every pass ends June 30 of the season it is bought in.
 */

/** July (months count from 0), the same season start as src/app/core/utils/season-games.ts. */
export const SEASON_START_MONTH = 6;

/** A Firebase Auth uid: letters, digits, - and _ (rules and the app use the same shape). */
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** PR previews are served from squares-4e4f7--<channel>.web.app and share the live database. */
const PREVIEW_ORIGIN = /^https:\/\/squares-4e4f7--[a-z0-9-]+\.web\.app$/;

/** What the app reads at entitlements/{uid}. */
export interface Entitlement {
  plan: "season";
  expiresAt: number;
  updatedAt: number;
}

/** purchases/{checkoutSessionId}: one paid Checkout Session, written only by the webhook. */
export interface PurchaseRecord {
  uid: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  createdAt: number;
  expiresAt: number;
  status: "paid" | "refunded";
}

/** The fields of a Stripe Checkout Session the grant reads. */
export interface SessionLike {
  id: string;
  mode?: string | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
  amount_total?: number | null;
  currency?: string | null;
}

/** When a pass bought at this time ends: the start of the next season (July 1, UTC), so it covers through June 30. */
export function seasonPassExpiry(nowMs: number): number {
  const date = new Date(nowMs);
  const endYear = date.getUTCMonth() >= SEASON_START_MONTH ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
  return Date.UTC(endYear, SEASON_START_MONTH, 1);
}

/** Where Stripe sends the buyer back: the site they bought from when it's ours, else quarterscore.com. */
export function checkoutReturnUrls(origin: unknown): { success: string; cancel: string } {
  const ours = typeof origin === "string" && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));
  const base = ours ? (origin as string) : SITE;
  return { success: `${base}/dashboard?pass=success`, cancel: `${base}/dashboard?pass=cancel` };
}

/** The purchase a paid Checkout Session records, or null when there is nothing to grant (unpaid, or no valid host on it). */
export function purchaseFromSession(session: SessionLike, now: number): PurchaseRecord | null {
  if (session.mode !== "payment" || session.payment_status !== "paid") return null;
  const uid = session.client_reference_id ?? session.metadata?.["uid"] ?? "";
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!UID_PATTERN.test(uid) || !paymentIntentId) return null;
  return {
    uid,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    paymentIntentId,
    createdAt: now,
    expiresAt: seasonPassExpiry(now),
    status: "paid",
  };
}

/** The host's pass after a purchase: the purchase's end date, or a later one they already hold (a gift that never expires). */
export function grantedEntitlement(current: Partial<Entitlement> | null, purchase: PurchaseRecord, now: number): Entitlement {
  const held = typeof current?.expiresAt === "number" ? current.expiresAt : 0;
  return { plan: "season", expiresAt: Math.max(held, purchase.expiresAt), updatedAt: now };
}

/** The host's pass after a full refund: ended now, unless it no longer comes from this purchase (then null: leave it). */
export function refundedEntitlement(current: Partial<Entitlement> | null, purchase: PurchaseRecord, now: number): Entitlement | null {
  if (current?.expiresAt !== purchase.expiresAt) return null;
  return { plan: "season", expiresAt: now, updatedAt: now };
}

/** Who is asking to buy, from the callable's auth token. */
export interface Buyer {
  uid?: string;
  provider?: string;
  email?: string;
  emailVerified?: boolean;
}

/** Why a buyer can't start checkout, or null when they can: signed in with an account, and no pass running yet. */
export function checkoutRefusal(buyer: Buyer, passEndsAt: number, now: number): string | null {
  if (!buyer.uid || !UID_PATTERN.test(buyer.uid)) return "Sign in to buy a Season Pass.";
  if (buyer.provider === "anonymous") return "Sign in with your email to buy a Season Pass.";
  if (passEndsAt > now) return "You already have a Season Pass.";
  return null;
}

/** The giftedSeasonPass key for an email, the same as the app's (lower case, every dot a comma). */
export function giftKey(email: string): string {
  return email.toLowerCase().replace(/\./g, ",");
}
