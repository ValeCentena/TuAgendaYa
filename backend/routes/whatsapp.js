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

function getMessagePhone(message) {
  return String(message?.from || message?.wa_id || message?.contacts?.[0]?.wa_id || "").replace(/\D/g, "");
}

function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("598") && digits.length >= 11) {
    return digits;
  }

  if (digits.length === 8 && digits.startsWith("9")) {
    return `598${digits}`;
  }

  if (digits.length === 9 && digits.startsWith("09")) {
    return `598${digits.slice(1)}`;
  }

  if (digits.length > 8 && digits.startsWith("0")) {
    return `598${digits.slice(1)}`;
  }

  return digits;
}

function isConfirmText(text) {
  const clean = String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "acepto",
    "confirmo",
    "confirmar",
    "si",
    "si confirmo",
    "si, confirmo",
    "sí",
    "sí, confirmo",
    "confirmado",
    "voy",
    "asisto",
  ].includes(clean);
}

function isCancelText(text) {
  const clean = String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "cancelar",
    "cancelo",
    "no",
    "no puedo asistir",
    "no asisto",
    "no voy",
    "rechazar",
    "rechazo",
  ].includes(clean);
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

  if (isConfirmText(raw)) {
    return {
      action: "confirm",
      token: null,
      id: null,
      generic: true,
    };
  }

  if (isCancelText(raw)) {
    return {
      action: "cancel",
      token: null,
      id: null,
      generic: true,
    };
  }

  return null;
}


async function findLatestPendingBookingByPhone(phone) {
  const normalized = normalizePhoneDigits(phone);

  if (!normalized) return null;

  const last8 = normalized.slice(-8);

  const result = await db.query(
    `
      SELECT *
      FROM bookings
      WHERE status IN ('pending', 'created')
        AND client_phone IS NOT NULL
        AND RIGHT(REGEXP_REPLACE(client_phone, '\\D', '', 'g'), 8) = $1
        AND booking_date >= CURRENT_DATE - INTERVAL '2 days'
      ORDER BY booking_date ASC, start_time ASC, created_at DESC, id DESC
      LIMIT 1
    `,
    [last8]
  );

  return result.rows[0] || null;
}

async function updateBookingFromWhatsApp(action, token, id, phone = null) {
  if (!action) return null;

  const nextStatus = action === "confirm" ? "confirmed" : "cancelled";

  if (token) {
    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = $2,
        client_confirmed_at = CASE
          WHEN $2 = 'confirmed' THEN NOW()
          ELSE client_confirmed_at
        END,
        client_cancelled_at = CASE
          WHEN $2 = 'cancelled' THEN NOW()
          ELSE client_cancelled_at
        END,
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
        client_confirmed_at = CASE
          WHEN $2 = 'confirmed' THEN NOW()
          ELSE client_confirmed_at
        END,
        client_cancelled_at = CASE
          WHEN $2 = 'cancelled' THEN NOW()
          ELSE client_cancelled_at
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, nextStatus]
    );

    return result.rows[0] || null;
  }

  if (phone) {
    const latest = await findLatestPendingBookingByPhone(phone);

    if (!latest) return null;

    const result = await db.query(
      `
        UPDATE bookings
        SET
          status = $2,
          client_confirmed_at = CASE
            WHEN $2 = 'confirmed' THEN NOW()
            ELSE client_confirmed_at
          END,
          client_cancelled_at = CASE
            WHEN $2 = 'cancelled' THEN NOW()
            ELSE client_cancelled_at
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [latest.id, nextStatus]
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

          const booking = await updateBookingFromWhatsApp(
            parsed.action,
            parsed.token,
            parsed.id,
            getMessagePhone(message)
          );

          if (booking) {
            console.log(
              `WhatsApp ${parsed.action} aplicado a reserva ${booking.id}`
            );
          } else {
            console.warn(
              `WhatsApp ${parsed.action} sin reserva. Token: ${
                parsed.token || "-"
              } ID: ${parsed.id || "-"} Teléfono: ${getMessagePhone(message) || "-"}`
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