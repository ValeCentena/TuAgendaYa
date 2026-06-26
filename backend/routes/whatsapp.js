const express = require("express");
const db = require("../db");

const router = express.Router();

function getButtonPayload(message) {
  if (!message) return "";

  return (
    message?.interactive?.button_reply?.id ||
    message?.interactive?.button_reply?.title ||
    message?.button?.payload ||
    message?.button?.text ||
    message?.text?.body ||
    ""
  );
}

function parseBookingAction(payload) {
  const raw = String(payload || "").trim();
  const text = raw.toLowerCase();

  if (!text) return null;

  if (text.startsWith("confirm_booking:")) {
    return {
      action: "confirm",
      token: raw.split(":").slice(1).join(":").trim(),
      id: null,
    };
  }

  if (text.startsWith("cancel_booking:")) {
    return {
      action: "cancel",
      token: raw.split(":").slice(1).join(":").trim(),
      id: null,
    };
  }

  if (text.startsWith("confirm_booking_id:")) {
    return {
      action: "confirm",
      token: null,
      id: raw.split(":").slice(1).join(":").trim(),
    };
  }

  if (text.startsWith("cancel_booking_id:")) {
    return {
      action: "cancel",
      token: null,
      id: raw.split(":").slice(1).join(":").trim(),
    };
  }

  if (
    text.includes("sí") ||
    text.includes("si, confirmo") ||
    text.includes("confirmo")
  ) {
    return {
      action: "confirm",
      token: null,
      id: null,
      fallbackText: true,
    };
  }

  if (
    text.includes("no puedo") ||
    text.includes("cancel") ||
    text.includes("no asistir")
  ) {
    return {
      action: "cancel",
      token: null,
      id: null,
      fallbackText: true,
    };
  }

  return null;
}

async function updateBookingFromWhatsApp(action, token, id) {
  if (!action) return null;

  const nextStatus = action === "confirm" ? "confirmed" : "cancelled";

  if (token) {
    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = $2,
        client_confirmed_at = CASE WHEN $2 = 'confirmed' THEN NOW() ELSE client_confirmed_at END,
        client_cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE client_cancelled_at END,
        updated_at = NOW()
      WHERE confirmation_token = $1
      RETURNING *
      `,
      [token, nextStatus]
    );

    return result.rows[0] || null;
  }

  if (id) {
    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = $2,
        client_confirmed_at = CASE WHEN $2 = 'confirmed' THEN NOW() ELSE client_confirmed_at END,
        client_cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE client_cancelled_at END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, nextStatus]
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
        const messages = Array.isArray(change?.value?.messages)
          ? change.value.messages
          : [];

        for (const message of messages) {
          const payload = getButtonPayload(message);
          const parsed = parseBookingAction(payload);

          console.log("WhatsApp webhook payload recibido:", payload);

          if (!parsed) {
            console.log("WhatsApp webhook ignorado: acción no reconocida");
            continue;
          }

          if (parsed.fallbackText) {
            console.warn(
              "WhatsApp webhook recibió texto de botón, pero no recibió token. No se puede sincronizar esta respuesta vieja."
            );
            continue;
          }

          const booking = await updateBookingFromWhatsApp(
            parsed.action,
            parsed.token,
            parsed.id
          );

          if (booking) {
            console.log(
              `WhatsApp ${parsed.action} aplicado a reserva ${booking.id}`
            );
          } else {
            console.warn(
              `WhatsApp ${parsed.action} sin reserva. Token: ${parsed.token || "-"} ID: ${parsed.id || "-"}`
            );
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