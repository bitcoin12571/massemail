// Simple logger service - replace console.log with this
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info');

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = levels[LOG_LEVEL] || levels.info;

function formatLog(level, prefix, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${prefix ? `[${prefix}] ` : ''}${message}`;
}

export const logger = {
  debug: (prefix, message) => {
    if (currentLevel <= levels.debug) {
      console.log(formatLog('debug', prefix, message));
    }
  },
  info: (prefix, message) => {
    if (currentLevel <= levels.info) {
      console.log(formatLog('info', prefix, message));
    }
  },
  warn: (prefix, message) => {
    if (currentLevel <= levels.warn) {
      console.warn(formatLog('warn', prefix, message));
    }
  },
  error: (prefix, message, error) => {
    if (currentLevel <= levels.error) {
      console.error(formatLog('error', prefix, message), error ? '\n' + error.stack : '');
    }
  }
};

export default logger;
