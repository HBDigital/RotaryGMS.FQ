const db = require('../database');

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

async function log(level, category, message, details = null) {
  try {
    const timestamp = new Date().toISOString();
    const detailsJson = details ? JSON.stringify(details) : null;
    
    await db.prepare(`
      INSERT INTO logs (timestamp, level, category, message, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(timestamp, level, category, message, detailsJson);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

module.exports = {
  LOG_LEVELS,
  debug: (category, message, details) => log(LOG_LEVELS.DEBUG, category, message, details),
  info: (category, message, details) => log(LOG_LEVELS.INFO, category, message, details),
  warn: (category, message, details) => log(LOG_LEVELS.WARN, category, message, details),
  error: (category, message, details) => log(LOG_LEVELS.ERROR, category, message, details),
};
