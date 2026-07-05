const webpush = require("web-push");
const db = require("../db");

let configured = false;

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@tuagendaya.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return true;
}

function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function ensurePushSubscriptionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_professional
    ON push_subscriptions(professional_id);
  `);
}

async function savePushSubscription(professionalId, subscription, userAgent = "") {
  await ensurePushSubscriptionsTable();

  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    const error = new Error("Suscripción push inválida");
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `
    INSERT INTO push_subscriptions (
      professional_id,
      endpoint,
      p256dh,
      auth,
      user_agent,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (endpoint)
    DO UPDATE SET
      professional_id = EXCLUDED.professional_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
    RETURNING id
    `,
    [professionalId, endpoint, p256dh, auth, userAgent || null]
  );

  return result.rows[0];
}

async function deletePushSubscription(endpoint) {
  if (!endpoint) return;
  await ensurePushSubscriptionsTable();
  await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

async function sendPushToProfessional(professionalId, payload) {
  await ensurePushSubscriptionsTable();

  if (!configureWebPush()) {
    console.warn("Push skipped: faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY");
    return { attempted: false, sent: 0, reason: "push_not_configured" };
  }

  const result = await db.query(
    `
    SELECT *
    FROM push_subscriptions
    WHERE professional_id = $1
    ORDER BY updated_at DESC
    `,
    [professionalId]
  );

  const subscriptions = result.rows;

  if (subscriptions.length === 0) {
    return { attempted: true, sent: 0, reason: "no_subscriptions" };
  }

  const body = JSON.stringify(payload || {});
  let sent = 0;
  let failed = 0;

  for (const row of subscriptions) {
    const subscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription, body);
      sent += 1;
    } catch (error) {
      failed += 1;

      if (error.statusCode === 404 || error.statusCode === 410) {
        await deletePushSubscription(row.endpoint);
      } else {
        console.warn("Push notification failed:", error.message);
      }
    }
  }

  return { attempted: true, sent, failed };
}

module.exports = {
  configureWebPush,
  isPushConfigured,
  ensurePushSubscriptionsTable,
  savePushSubscription,
  deletePushSubscription,
  sendPushToProfessional,
};