import winston from 'winston';
import 'winston-daily-rotate-file';

// Define log formats
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for console output
const consoleLogFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    let out = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length) {
      out += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      out += `\n${stack}`;
    }
    return out;
  })
);

const isProduction = process.env.NODE_ENV === 'production';

// In production / container environments (e.g. Azure Container Apps), standard best practice
// is streaming structured JSON logs directly to stdout/stderr for Azure Log Analytics ingestion.
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), json())
      : consoleLogFormat,
  }),
];

// In local development, also write rotating log files for offline inspection
if (!isProduction) {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: combine(timestamp(), json()),
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: combine(errors({ stack: true }), timestamp(), json()),
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports,
});
