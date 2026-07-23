const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

function getActiveProvider() {
  return isConfigured() ? "cloud" : "not_configured";
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

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
    console.warn(
      "WhatsApp skipped: WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados"
    );

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

async function sendTemplateMessage(phone, templateName, languageCode, parameters = [], buttonPayloads = []) {
  const to = normalizePhone(phone);

  if (!to) {
    console.warn("WhatsApp template skipped: teléfono vacío");

    return {
      skipped: true,
      reason: "empty_phone",
    };
  }

  const components = [
    {
      type: "body",
      parameters: parameters.map((value) => ({
        type: "text",
        text: String(value || ""),
      })),
    },
  ];

  buttonPayloads.forEach((payloadValue, index) => {
    if (!payloadValue) return;

    components.push({
      type: "button",
      sub_type: "quick_reply",
      index: String(index),
      parameters: [
        {
          type: "payload",
          payload: String(payloadValue),
        },
      ],
    });
  });

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode || process.env.WHATSAPP_TEMPLATE_LANGUAGE || "es_UY",
      },
      components,
    },
  };

  return sendCloudMessage(payload);
}

async function sendBookingConfirmationTemplate(booking = {}, professional = {}) {
  const templateName =
    process.env.WHATSAPP_CONFIRMATION_TEMPLATE ||
    process.env.WHATSAPP_BOOKING_TEMPLATE ||
    "";

  if (!templateName) {
    return {
      skipped: true,
      reason: "template_not_configured",
    };
  }

  const clientPhone = getBookingValue(
    booking,
    "client_phone",
    "clientPhone",
    "phone",
    "telefono"
  );

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

  const bookingDate = formatDateForMessage(
    getBookingValue(booking, "booking_date", "bookingDate", "date")
  );

  const startTime = formatTimeForMessage(
    getBookingValue(booking, "start_time", "startTime", "time")
  );

  const token = getBookingValue(
    booking,
    "confirmation_token",
    "confirmationToken",
    "token"
  );

  const bookingId = getBookingValue(booking, "id", "bookingId");

  const confirmId = token
    ? `confirm_booking:${token}`
    : `confirm_booking_id:${bookingId}`;

  const cancelId = token
    ? `cancel_booking:${token}`
    : `cancel_booking_id:${bookingId}`;

  const result = await sendTemplateMessage(
    clientPhone,
    templateName,
    process.env.WHATSAPP_TEMPLATE_LANGUAGE || "es_UY",
    [clientName, businessName, serviceName, bookingDate, startTime],
    [confirmId, cancelId]
  );

  console.log(`WhatsApp booking template sent to ${normalizePhone(clientPhone)}`);

  return result;
}

async function sendBookingConfirmationInteractive(booking = {}, professional = {}) {
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

async function sendBookingConfirmationMessage(booking = {}, professional = {}) {
  const templateName =
    process.env.WHATSAPP_CONFIRMATION_TEMPLATE ||
    process.env.WHATSAPP_BOOKING_TEMPLATE ||
    "";

  if (templateName) {
    return sendBookingConfirmationTemplate(booking, professional);
  }

  return sendBookingConfirmationInteractive(booking, professional);
}

// Alias por compatibilidad con código viejo
const sendBookingConfirmation = sendBookingConfirmationMessage;

async function sendBusinessBookingNotification(booking = {}, professional = {}) {
  const businessPhone =
    professional?.phone ||
    professional?.business_phone ||
    professional?.businessPhone ||
    professional?.whatsapp ||
    professional?.whatsapp_phone ||
    professional?.whatsappPhone ||
    "";

  const to = normalizePhone(businessPhone);

  if (!to) {
    console.warn("WhatsApp business notification skipped: negocio sin teléfono");

    return {
      skipped: true,
      reason: "empty_business_phone",
    };
  }

  const businessName =
    professional?.business_name ||
    professional?.businessName ||
    professional?.name ||
    getBookingValue(booking, "business_name", "businessName") ||
    "TuAgendaYa";

  const clientName =
    getBookingValue(booking, "client_name", "clientName", "name", "nombre") ||
    "Cliente";

  const clientPhone =
    getBookingValue(booking, "client_phone", "clientPhone", "phone", "telefono") ||
    "Sin teléfono";

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

  const body = [
    `Nueva reserva en ${businessName}`,
    "",
    `Cliente: ${clientName}`,
    `Teléfono: ${clientPhone}`,
    `Servicio: ${serviceName}`,
    staffName ? `Profesional: ${staffName}` : "",
    `Fecha: ${bookingDate}`,
    `Hora: ${startTime}`,
    "",
    "Entrá al panel para gestionar el turno.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendWhatsApp(to, body);

  console.log(`WhatsApp business notification sent to ${to}`);

  return result;
}


async function sendBookingReminderConfirmationMessage(booking = {}, professional = {}) {
  const templateName =
    process.env.WHATSAPP_REMINDER_TEMPLATE ||
    process.env.WHATSAPP_CONFIRMATION_TEMPLATE ||
    process.env.WHATSAPP_BOOKING_TEMPLATE ||
    "";

  if (templateName) {
    return sendBookingConfirmationTemplate(
      booking,
      professional
    );
  }

  return sendBookingConfirmationInteractive(
    {
      ...booking,
      reminder: true,
    },
    professional
  );
}

async function sendReminder(booking = {}, professional = {}) {
  return sendBookingReminderConfirmationMessage(booking, professional);
}

module.exports = {
  sendWhatsApp,
  sendTemplateMessage,
  sendBookingConfirmation,
  sendBookingConfirmationMessage,
  sendBookingConfirmationTemplate,
  sendBookingConfirmationInteractive,
  sendBusinessBookingNotification,
  sendBookingReminderConfirmationMessage,
  sendReminder,
  getActiveProvider,
  normalizePhone,
};