import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { fetchScoreboard } from "./espn";
import { syncLiveScores } from "./sync";

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
