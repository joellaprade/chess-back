import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', // can be 'debug', 'warn', 'error', etc.
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/var/log/chess-backend-logs' })
  ]
});

export default logger;
