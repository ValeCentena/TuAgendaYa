const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

require("./db");

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

function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: "Demasiados intentos de inicio de sesión. Intentá nuevamente en 15 minutos.",
    },
  });
}

const professionalLoginLimiter = createLoginLimiter();
const adminLoginLimiter = createLoginLimiter();

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

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "tuagendaya-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth/login", professionalLoginLimiter);
app.use("/api/admin/login", adminLoginLimiter);

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