const express = require("express");
const db = require("../db");

const router = express.Router();

function getButtonPayload(message) {
  if (!message) return "";

  return (
    message?.interactive?.button_reply?.id ||
    message?.button?.payload ||
    message?.button?.text ||
    ""
  );
}

function parseBookingAction(payload) {
  const text = String(payload || "").trim();

  if (text.startsWith("CONFIRM_BOOKING:")) {
    return {
      action: "confirm",
      token: text.replace("CONFIRM_BOOKING:", "").trim(),
    };
  }

  if (text.startsWith("CANCEL_BOOKING:")) {
    return {
      action: "cancel",
      token: text.replace("CANCEL_BOOKING:", "").trim(),
    };
  }

  return null;
}

async function updateBookingFromWhatsApp(action, token) {
  if (!token) return null;

  if (action === "confirm") {
    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'confirmed',
        client_confirmed_at = NOW(),
        client_cancelled_at = NULL,
        updated_at = NOW()
      WHERE confirmation_token = $1
      RETURNING *
      `,
      [token]
    );

    return result.rows[0] || null;
  }

  if (action === "cancel") {
    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'cancelled',
        client_cancelled_at = NOW(),
        updated_at = NOW()
      WHERE confirmation_token = $1
      RETURNING *
      `,
      [token]
    );

    return result.rows[0] || null;
  }

  return null;
}

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post("/webhook", async (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];

        for (const message of messages) {
          const payload = getButtonPayload(message);
          const parsed = parseBookingAction(payload);

          if (!parsed) continue;

          const booking = await updateBookingFromWhatsApp(parsed.action, parsed.token);

          if (booking) {
            console.log(`WhatsApp ${parsed.action} aplicado a reserva ${booking.id}`);
          } else {
            console.warn(`WhatsApp ${parsed.action} sin reserva para token ${parsed.token}`);
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return res.sendStatus(200);
  }
});

module.exports = router;