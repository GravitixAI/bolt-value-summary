import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const appMeta = {
  name: process.env.APP_NAME || 'bolt-value-summary',
  version: process.env.npm_package_version || '0.0.0',
  environment: process.env.NODE_ENV || 'development',
};

const jsonFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  return JSON.stringify({ timestamp, level, message, ...metadata, app: appMeta });
});

const accessFilter = winston.format((info) => {
  return info.request ? info : false;
});

const appFilter = winston.format((info) => {
  return !info.request && !info.error ? info : false;
});

const errorFilter = winston.format((info) => {
  return info.level === 'error' || info.level === 'fatal' || info.error ? info : false;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      format: winston.format.combine(accessFilter(), jsonFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: winston.format.combine(appFilter(), jsonFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      format: winston.format.combine(errorFilter(), jsonFormat),
    }),
  ],
});

export function logRequest(
  req: { method: string; url: string; ip?: string; headers?: Record<string, string> },
  res: { statusCode: number },
  duration: number,
  user?: { id: string; username?: string; role?: string }
) {
  const level = res.statusCode >= 400 ? 'warn' : 'info';

  logger.log(level, 'HTTP Request', {
    request: {
      method: req.method,
      url: req.url,
      endpoint: req.url.split('?')[0],
      ip: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req.headers?.['user-agent'],
      referer: req.headers?.['referer'],
      duration,
      statusCode: res.statusCode,
    },
    user: user || { id: 'anonymous', username: 'N/A' },
  });

  if (res.statusCode >= 500) {
    logger.error('Server error response', {
      error: {
        name: 'HTTPError',
        message: `Server returned ${res.statusCode}`,
        code: String(res.statusCode),
      },
      request: { method: req.method, url: req.url, ip: req.ip || 'unknown' },
      user,
    });
  }
}

export function logEvent(message: string, context?: Record<string, unknown>) {
  logger.info(message, { context });
}

export function logWarning(message: string, context?: Record<string, unknown>) {
  logger.warn(message, { context });
}

export function logError(
  error: Error,
  context?: {
    request?: { method: string; url: string; ip?: string };
    user?: { id: string; username?: string };
    [key: string]: unknown;
  }
) {
  logger.error(error.message, {
    error: { name: error.name, message: error.message, stack: error.stack },
    ...context,
  });
}

export function logFatal(error: Error, context?: Record<string, unknown>) {
  logger.log('fatal', error.message, {
    error: { name: error.name, message: error.message, stack: error.stack },
    context,
  });
}
