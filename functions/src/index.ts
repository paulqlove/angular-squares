import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "node:crypto";
import { continueUrl, directLink, isValidEmail, renderEmail, withAccountHint } from "./signin-email";
import { fetchScoreboard } from "./espn";
import { syncLiveScores } from "./sync";
import { runDueAutoManage } from "./auto-manage-run";
import { PREVIEW_PATHS, PreviewFields, previewFields } from "./preview-card";
import { checkoutRefusal, Entitlement, giftKey, PurchaseRecord, isPriceId, stripeErrorSummary } from "./season-pass";
import { StripeEventDeps } from "./stripe-events";

const DEFAULT_DATABASE_URL = "https://squares-4e4f7-default-rtdb.firebaseio.com";

function databaseUrl(): string {
  if (process.env["FIREBASE_DATABASE_URL"]) return process.env["FIREBASE_DATABASE_URL"];
  if (process.env["FIREBASE_CONFIG"]) {
    try {
      const config = JSON.parse(process.env["FIREBASE_CONFIG"]) as { databaseURL?: string };
      if (config.databaseURL) return config.databaseURL;
    } catch {
      // Fall through to the project default.
    }
  }
  return DEFAULT_DATABASE_URL;
}

initializeApp({ databaseURL: databaseUrl() });

/**
 * Cloud Scheduler cannot run more often than once a minute. Holding the
 * instance open to poll inside the minute would bill idle CPU and leave
 * the free tier, so this stays at one short run per minute.
 *
 * Deploy by hand: firebase deploy --only functions
 * GitHub Actions deploys Hosting only and must not deploy this.
 */
export const syncEspnScores = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    timeZone: "Etc/UTC",
    timeoutSeconds: 30,
    memory: "256MiB",
    cpu: 0.167,
    maxInstances: 1,
  },
  async () => {
    const db = getDatabase();
    await syncLiveScores({
      readLiveGames: async () => (await db.ref("liveGames").get()).val(),
      readGame: async (boardId: string) => (await db.ref(`games/${boardId}`).get()).val(),
      update: async (updates) => {
        await db.ref().update(updates);
      },
      fetchScoreboard,
      log: (message, details) => logger.info(message, details ?? {}),
    });
  }
);

/**
 * Locks, shrinks and draws boards whose host switched on Auto-manage. The run time is
 * saved on the board by the app (kickoff plus 5 minutes), so this never asks a sports feed.
 * Deploy by hand: firebase deploy --only functions:runAutoManage
 */
export const runAutoManage = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    timeZone: "Etc/UTC",
    timeoutSeconds: 30,
    memory: "256MiB",
    cpu: 0.167,
    maxInstances: 1,
  },
  async () => {
    const db = getDatabase();
    const result = await runDueAutoManage({
      readDue: async (now) =>
        (await db.ref("autoManageQueue").orderByValue().endAt(now).limitToFirst(50).get()).val(),
      readGame: async (boardId: string) => (await db.ref(`games/${boardId}`).get()).val(),
      update: async (updates) => {
        await db.ref().update(updates);
      },
      log: (message, details) => logger.info(message, details ?? {}),
    });
    if (result.due > 0) logger.info("auto-manage run", { ...result });
  }
);

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Emails a branded, passwordless sign-in link from signin@quarterscore.com via Resend.
 * One send per address per minute so the endpoint can't be used to flood an inbox.
 * Deploy by hand: firebase deploy --only functions:sendSignInLink
 */
export const sendSignInLink = onCall(
  { region: "us-central1", secrets: [RESEND_API_KEY], memory: "256MiB", maxInstances: 5, timeoutSeconds: 15, invoker: "public" },
  async (request) => {
    const email = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) throw new HttpsError("invalid-argument", "Enter a valid email address.");

    const throttle = getDatabase().ref(`emailLinkSends/${createHash("sha256").update(email).digest("hex")}`);
    const last = (await throttle.get()).val();
    if (typeof last === "number" && Date.now() - last < RESEND_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "We just sent a link to that email. Check your inbox, or try again in a minute.");
    }

    const landing = continueUrl(request.rawRequest.headers.origin);
    const generated = await getAuth().generateSignInWithEmailLink(email, { url: landing, handleCodeInApp: true });
    const accountExists = await getAuth().getUserByEmail(email).then(() => true, (error: { code?: string }) => {
      if (error?.code !== "auth/user-not-found") logger.warn("account lookup failed", { code: error?.code });
      return false;
    });
    const { subject, html, text } = renderEmail(directLink(generated, withAccountHint(landing, accountExists)), email);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "QuarterScore <signin@quarterscore.com>", to: [email], subject, html, text }),
    });
    if (!response.ok) {
      logger.error("Resend send failed", { status: response.status, body: await response.text() });
      throw new HttpsError("unavailable", "We couldn't send the email. Try again in a minute.");
    }
    await throttle.set(Date.now());
    return { sent: true };
  }
);

/** Reads only the board fields a link preview shows, in parallel, never the whole board. */
async function readPreviewFields(gameId: string): Promise<PreviewFields | null> {
  const db = getDatabase();
  const values = await Promise.all(PREVIEW_PATHS.map(path => db.ref(`games/${gameId}/${path}`).get()));
  return previewFields(Object.fromEntries(PREVIEW_PATHS.map((path, i) => [path, values[i].val()])));
}

/**
 * The link-preview picture for one board, the dashboard card at 1200x630 (docs/FUNCTIONS.md, Link previews).
 * The renderer is loaded on first use so the score jobs' cold starts stay light.
 * Deploy by hand: firebase deploy --only functions:gamePreviewImage
 */
export const gamePreviewImage = onRequest(
  { region: "us-central1", memory: "512MiB", timeoutSeconds: 20, maxInstances: 5, invoker: "public" },
  async (req, res) => {
    const { servePreviewImage } = await import("./preview-http");
    await servePreviewImage(req, res, readPreviewFields, (message, details) => logger.warn(message, details));
  }
);

/**
 * Every /game/{id} page: Hosting's game.html with that board's title and preview picture in its link tags,
 * so a shared link shows the board instead of the site's generic picture. Fetches the game page shell (Hosting serves game.html at /game) from the same site
 * on each request, so a Hosting deploy is picked up at once.
 * Deploy by hand: firebase deploy --only functions:gamePage
 */
export const gamePage = onRequest(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 10, maxInstances: 10, invoker: "public" },
  async (req, res) => {
    const { serveGamePage } = await import("./preview-page");
    await serveGamePage(req, res, {
      readPreview: readPreviewFields,
      fetchShell: async (origin) => {
        const response = await fetch(`${origin}/game`, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error(`game shell ${response.status}`);
        return response.text();
      },
      log: (message, details) => logger.warn(message, details),
    });
  }
);

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
/** The $5.99 Season Pass price (price_...), set tax-inclusive in the Stripe dashboard. Not a secret: asked for at deploy. */
const STRIPE_PRICE_ID = defineString("STRIPE_PRICE_ID", { description: "Stripe price id for the Season Pass (price_...)" });

/** When the caller's longest pass ends, paid or gifted (0 when they have none). */
async function passEndsAt(uid: string, email: string | undefined, emailVerified: boolean): Promise<number> {
  const db = getDatabase();
  const [paid, gifted] = await Promise.all([
    db.ref(`entitlements/${uid}/expiresAt`).get(),
    email && emailVerified ? db.ref(`giftedSeasonPass/${giftKey(email)}/expiresAt`).get() : null,
  ]);
  const ends = [paid.val(), gifted?.val()].filter((value): value is number => typeof value === "number");
  return Math.max(0, ...ends);
}

/**
 * Starts a Season Pass purchase: returns the Stripe Checkout page to send the host to. The pass itself is only
 * granted by stripeWebhook once Stripe says the payment went through, never by the browser.
 * Deploy by hand: firebase deploy --only functions:createCheckoutSession
 */
export const createCheckoutSession = onCall(
  { region: "us-central1", secrets: [STRIPE_SECRET_KEY], memory: "256MiB", maxInstances: 5, timeoutSeconds: 15, invoker: "public" },
  async (request) => {
    const token = request.auth?.token;
    const buyer = { uid: request.auth?.uid, provider: token?.firebase?.sign_in_provider, email: token?.email, emailVerified: token?.email_verified === true };
    const refusal = checkoutRefusal(buyer, buyer.uid ? await passEndsAt(buyer.uid, buyer.email, buyer.emailVerified) : 0, Date.now());
    if (refusal) throw new HttpsError(refusal.includes("already") ? "already-exists" : "unauthenticated", refusal);

    const priceId = STRIPE_PRICE_ID.value();
    if (!isPriceId(priceId)) {
      // Never log the value: a pasted key or secret is the usual mistake.
      logger.error("checkout misconfigured: STRIPE_PRICE_ID is not a Stripe price id (price_...). Fix functions/.env.squares-4e4f7 and redeploy.");
      throw new HttpsError("unavailable", "Checkout isn't available right now. Try again in a minute.");
    }
    const { createCheckoutUrl } = await import("./stripe-checkout");
    try {
      const url = await createCheckoutUrl(STRIPE_SECRET_KEY.value(), priceId, {
        uid: buyer.uid!, email: buyer.email, origin: request.rawRequest.headers.origin,
      });
      return { url };
    } catch (error) {
      logger.error(`checkout session failed: ${stripeErrorSummary(error)}`);
      throw new HttpsError("unavailable", "Checkout isn't available right now. Try again in a minute.");
    }
  }
);

/** The webhook's database steps (stripe-events.ts explains each). Only this function writes purchases. */
function stripeEventDeps(): StripeEventDeps {
  const db = getDatabase();
  return {
    savePurchase: async (sessionId, purchase) => {
      const result = await db.ref(`purchases/${sessionId}`).transaction((current: PurchaseRecord | null) => current ?? purchase);
      return result.snapshot.val() as PurchaseRecord;
    },
    findPurchaseByPaymentIntent: async (paymentIntentId) => {
      const found = (await db.ref("purchases").orderByChild("paymentIntentId").equalTo(paymentIntentId).limitToFirst(1).get()).val();
      const [entry] = Object.entries((found ?? {}) as Record<string, PurchaseRecord>);
      return entry ? { sessionId: entry[0], purchase: entry[1] } : null;
    },
    markRefunded: async (sessionId) => {
      await db.ref(`purchases/${sessionId}/status`).set("refunded");
    },
    readEntitlement: async (uid) => (await db.ref(`entitlements/${uid}`).get()).val() as Partial<Entitlement> | null,
    writeEntitlement: async (uid, entitlement) => {
      await db.ref(`entitlements/${uid}`).set(entitlement);
    },
    now: () => Date.now(),
  };
}

/**
 * Stripe's webhook endpoint: grants the Season Pass on a paid checkout and ends it on a full refund.
 * A bad signature gets 400 (not from Stripe); a failure gets 500 so Stripe retries the event later.
 * Deploy by hand: firebase deploy --only functions:stripeWebhook
 */
export const stripeWebhook = onRequest(
  { region: "us-central1", secrets: [STRIPE_WEBHOOK_SECRET], memory: "256MiB", maxInstances: 5, timeoutSeconds: 30, invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }
    const { verifiedEvent } = await import("./stripe-checkout");
    const { handleStripeEvent } = await import("./stripe-events");
    let event;
    try {
      event = verifiedEvent(req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
    } catch (error) {
      logger.warn("stripe webhook signature rejected", { message: (error as Error).message });
      res.status(400).send("Bad signature");
      return;
    }
    try {
      const result = await handleStripeEvent(event, stripeEventDeps());
      logger.info("stripe event", { id: event.id, type: event.type, result });
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error("stripe event failed", { id: event.id, type: event.type, message: (error as Error).message });
      res.status(500).send("Try again");
    }
  }
);
