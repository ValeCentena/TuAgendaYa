const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const db = require("./db");

const authRoutes = require("./routes/auth");
const professionalsRoutes = require("./routes/professionals");
const bookingsRoutes = require("./routes/bookings");
const staffRoutes = require("./routes/staff");
const adminRoutes = require("./routes/admin");
const whatsappRoutes = require("./routes/whatsapp");
const paymentsRoutes = require("./routes/payments");
const { startBookingReminderWorker } = require("./services/reminders");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(helmet());

function createLoginLimiter() {
  const attemptsByIp = new Map();
  const windowMs = 15 * 60 * 1000;
  const maxFailedAttempts = 10;

  return (req, res, next) => {
    const loginIdentifier = String(req.body?.email || "").trim().toLowerCase();
    const key = loginIdentifier || req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let record = attemptsByIp.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      attemptsByIp.set(key, record);
    }

    if (record.count >= maxFailedAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        error: "Demasiados intentos de inicio de sesión. Intentá nuevamente en 15 minutos.",
      });
    }

    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        attemptsByIp.delete(key);
        return;
      }

      if (res.statusCode === 401) {
        const current = attemptsByIp.get(key);
        const finishedAt = Date.now();

        if (!current || current.resetAt <= finishedAt) {
          attemptsByIp.set(key, { count: 1, resetAt: finishedAt + windowMs });
        } else {
          current.count += 1;
        }
      }
    });

    next();
  };
}

const professionalLoginLimiter = createLoginLimiter();
const adminLoginLimiter = createLoginLimiter();

function createPublicBookingLimiter() {
  const bookingsByClient = new Map();
  const windowMs = 15 * 60 * 1000;
  const maxSuccessfulBookings = 5;

  return (req, res, next) => {
    const slug = String(req.params?.slug || "").trim().toLowerCase();
    const clientPhone = String(req.body?.clientPhone || req.body?.client_phone || "")
      .replace(/\D/g, "");

    const key = `${slug}:${clientPhone || "unknown"}`;
    const now = Date.now();
    let record = bookingsByClient.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      bookingsByClient.set(key, record);
    }

    if (record.count >= maxSuccessfulBookings) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        error: "Se alcanzó el límite de reservas para este número. Intentá nuevamente en 15 minutos.",
      });
    }

    res.on("finish", () => {
      if (res.statusCode === 201) {
        const current = bookingsByClient.get(key);
        const finishedAt = Date.now();

        if (!current || current.resetAt <= finishedAt) {
          bookingsByClient.set(key, { count: 1, resetAt: finishedAt + windowMs });
        } else {
          current.count += 1;
        }
      }
    });

    next();
  };
}

const publicBookingLimiter = createPublicBookingLimiter();

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tuagendaya-web.onrender.com",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      ok: true,
      service: "tuagendaya-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database error:", error.message);

    res.status(503).json({
      ok: false,
      service: "tuagendaya-api",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api/auth/login", professionalLoginLimiter);
app.use("/api/admin/login", adminLoginLimiter);
app.post("/api/bookings/public/:slug/book", publicBookingLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/payments", paymentsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((error, req, res, next) => {
  console.error("Error general:", error);
  res.status(error.status || 500).json({
    error: error.message || "Error interno del servidor",
  });
});

app.listen(PORT, () => {
  console.log(`TuAgendaYa API escuchando en puerto ${PORT}`);
  startBookingReminderWorker();
});