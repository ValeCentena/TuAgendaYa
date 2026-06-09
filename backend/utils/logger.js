const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString();
}

function writeLog(level, message, meta = {}) {
  const entry = {
    time: timestamp(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (process.env.NODE_ENV !== 'test') {
    console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`, meta.err || meta.stack || '');
  }

  if (process.env.NODE_ENV !== 'test') {
    try {
      ensureLogsDir();
      fs.appendFileSync(path.join(logsDir, 'app.log'), `${line}\n`);
    } catch {
      // ignore log write failures
    }
  }
}

const logger = {
  info(message, meta) {
    writeLog('info', message, meta);
  },
  warn(message, meta) {
    writeLog('warn', message, meta);
  },
  error(message, meta) {
    writeLog('error', message, meta);
  },
};

module.exports = logger;
