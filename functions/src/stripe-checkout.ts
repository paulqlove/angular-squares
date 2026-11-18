import Stripe from "stripe";
import { checkoutReturnUrls } from "./season-pass";

/**
 * The two Stripe calls the Season Pass makes. index.ts loads this file on first use, so the score jobs never
 * load the Stripe SDK. Keys come from Firebase secrets; none is ever logged or sent to the browser.
 */

export interface CheckoutRequest {
  uid: string;
  email?: string;
  origin: unknown;
}

/**
 * A Stripe-hosted Checkout page for one Season Pass. Managed Payments makes Stripe the seller of record, so it
 * works out and files sales tax; the price itself is set tax-inclusive in the dashboard, so the buyer pays $5.99.
 */
export async function createCheckoutUrl(secretKey: string, priceId: string, request: CheckoutRequest): Promise<string> {
  const stripe = new Stripe(secretKey);
  const urls = checkoutReturnUrls(request.origin);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    managed_payments: { enabled: true },
    client_reference_id: request.uid,
    metadata: { uid: request.uid },
    ...(request.email ? { customer_email: request.email } : {}),
    success_url: urls.success,
    cancel_url: urls.cancel,
  });
  if (!session.url) throw new Error("Stripe returned a session without a URL");
  return session.url;
}

/** The event Stripe signed, or a thrown error when the signature doesn't match (someone else posted it). */
export function verifiedEvent(rawBody: Buffer, signature: string | string[] | undefined, webhookSecret: string): Stripe.Event {
  if (typeof signature !== "string") throw new Error("Missing Stripe-Signature header");
  return Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
