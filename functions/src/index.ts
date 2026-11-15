import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "node:crypto";
import { continueUrl, directLink, isValidEmail, renderEmail, withAccountHint } from "./signin-email";
import { fetchScoreboard } from "./espn";
import { syncLiveScores } from "./sync";
import { runDueAutoManage } from "./auto-manage-run";
import { PREVIEW_PATHS, PreviewFields, previewFields } from "./preview-card";

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
