const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'app.log');

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level: 'INFO', message, ...meta });
    console.log(`[INFO] ${message}`);
    fs.appendFileSync(logFilePath, logEntry + '\n');
  },
  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level: 'ERROR', message, ...meta });
    console.error(`[ERROR] ${message}`);
    fs.appendFileSync(logFilePath, logEntry + '\n');
  }
};

module.exports = { logger, logFilePath };
