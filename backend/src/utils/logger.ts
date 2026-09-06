import winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

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

// File transport options for daily rotation
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // Keep logs for 14 days
  maxSize: '20m',  // Rotate if file exceeds 20MB
  format: combine(timestamp(), json()),
});

const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '20m',
  format: combine(errors({ stack: true }), timestamp(), json()),
});

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
    new winston.transports.Console({
      format: consoleLogFormat,
    }),
  ],
});
