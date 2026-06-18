const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./db");

const authRoutes = require("./routes/auth");
const professionalsRoutes = require("./routes/professionals");
const bookingsRoutes = require("./routes/bookings");
const staffRoutes = require("./routes/staff");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3001;

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

      return callback(null, true);
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

app.use("/api/auth", authRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);

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
});