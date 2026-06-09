const { validateEnv } = require('./config/env');
const { initDb } = require('./db');
const { createApp } = require('./app');
const { startReminderScheduler } = require('./services/reminders');
const logger = require('./utils/logger');

validateEnv();
initDb();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`TuAgendaYa API en puerto ${PORT}`, {
    nodeEnv: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_PATH || 'local/tuagendaya.db',
  });
  startReminderScheduler();
});
