const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function getActiveProvider() {
  return isConfigured() ? "cloud" : "not_configured";
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  // Uruguay: si escriben 93405195, lo convertimos a 59893405195
  if (digits.length === 8 && digits.startsWith("9")) {
    return `598${digits}`;
  }

  // Si ya viene con 598, lo dejamos igual
  if (digits.startsWith("598")) {
    return digits;
  }

  return digits;
}

function getBookingValue(booking, ...keys) {
  for (const key of keys) {
    if (
      booking &&
      booking[key] !== undefined &&
      booking[key] !== null &&
      booking[key] !== ""
    ) {
      return booking[key];
    }
  }

  return "";
}

function formatDateForMessage(value) {
  const raw = String(value || "").slice(0, 10);

  if (!raw) return "fecha a confirmar";

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return raw;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatTimeForMessage(value) {
  const raw = String(value || "").slice(0, 5);
  return raw || "hora a confirmar";
}

async function sendCloudMessage(payload) {
  if (!isConfigured()) {
    console.warn("WhatsApp skipped: WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados");

    return {
      skipped: true,
      reason: "not_configured",
    };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("WhatsApp Cloud API error:", JSON.stringify(data, null, 2));

    const error = new Error(
      data?.error?.message ||
        data?.error?.error_user_msg ||
        "Error enviando WhatsApp"
    );

    error.status = response.status;
    error.meta = data;

    throw error;
  }

  return data;
}

async function sendWhatsApp(phone, text) {
  const to = normalizePhone(phone);

  if (!to) {
    console.warn("WhatsApp skipped: teléfono vacío");

    return {
      skipped: true,
      reason: "empty_phone",
    };
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: String(text || ""),
    },
  };

  return sendCloudMessage(payload);
}

async function sendBookingConfirmationMessage(booking = {}, professional = {}) {
  const to = normalizePhone(
    getBookingValue(booking, "client_phone", "clientPhone", "phone", "telefono")
  );

  if (!to) {
    console.warn("WhatsApp confirmation skipped: reserva sin teléfono");

    return {
      skipped: true,
      reason: "empty_phone",
    };
  }

  const token = getBookingValue(
    booking,
    "confirmation_token",
    "confirmationToken",
    "token"
  );

  const bookingId = getBookingValue(booking, "id", "bookingId");

  const clientName =
    getBookingValue(booking, "client_name", "clientName", "name", "nombre") ||
    "cliente";

  const businessName =
    professional?.business_name ||
    professional?.businessName ||
    professional?.name ||
    getBookingValue(
      booking,
      "business_name",
      "businessName",
      "professional_name",
      "professionalName"
    ) ||
    "TuAgendaYa";

  const serviceName =
    getBookingValue(booking, "service_name", "serviceName") || "Servicio";

  const staffName =
    getBookingValue(booking, "staff_name", "staffName") ||
    getBookingValue(booking, "professional_name", "professionalName") ||
    "";

  const bookingDate = formatDateForMessage(
    getBookingValue(booking, "booking_date", "bookingDate", "date")
  );

  const startTime = formatTimeForMessage(
    getBookingValue(booking, "start_time", "startTime", "time")
  );

  const confirmId = token
    ? `confirm_booking:${token}`
    : `confirm_booking_id:${bookingId}`;

  const cancelId = token
    ? `cancel_booking:${token}`
    : `cancel_booking_id:${bookingId}`;

  const bodyText = [
    `Hola ${clientName}, recibimos tu reserva en ${businessName}.`,
    "",
    `Servicio: ${serviceName}`,
    staffName ? `Profesional: ${staffName}` : "",
    `Fecha: ${bookingDate}`,
    `Hora: ${startTime}`,
    "",
    "¿Vas a asistir?",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Confirmación de reserva",
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: "TuAgendaYa",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: confirmId,
              title: "Sí, confirmo",
            },
          },
          {
            type: "reply",
            reply: {
              id: cancelId,
              title: "No puedo asistir",
            },
          },
        ],
      },
    },
  };

  const result = await sendCloudMessage(payload);

  console.log(`WhatsApp confirmation sent to ${to}`);

  return result;
}

// Alias por compatibilidad con código viejo
const sendBookingConfirmation = sendBookingConfirmationMessage;

async function sendReminder(booking = {}, professional = {}) {
  const clientName =
    getBookingValue(booking, "client_name", "clientName", "name", "nombre") ||
    "cliente";

  const businessName =
    professional?.business_name ||
    professional?.businessName ||
    professional?.name ||
    getBookingValue(
      booking,
      "business_name",
      "businessName",
      "professional_name",
      "professionalName"
    ) ||
    "TuAgendaYa";

  const bookingDate = formatDateForMessage(
    getBookingValue(booking, "booking_date", "bookingDate", "date")
  );

  const startTime = formatTimeForMessage(
    getBookingValue(booking, "start_time", "startTime", "time")
  );

  const text = `Hola ${clientName}. Te recordamos tu reserva en ${businessName} para el ${bookingDate} a las ${startTime}.`;

  return sendWhatsApp(
    getBookingValue(booking, "client_phone", "clientPhone", "phone", "telefono"),
    text
  );
}

module.exports = {
  sendWhatsApp,
  sendBookingConfirmation,
  sendBookingConfirmationMessage,
  sendReminder,
  getActiveProvider,
  normalizePhone,
};