import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'payment-mcp-server' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // File transport for access logs
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Add error logging middleware
export const errorLogger = (err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  next(err);
};

// Add audit logging
export const auditLogger = {
  info: (action: string, details: any, userId?: string) => {
    logger.info('Audit Log', {
      action,
      details,
      userId,
      timestamp: new Date().toISOString(),
      ip: 'system'
    });
  },

  warn: (action: string, details: any, userId?: string) => {
    logger.warn('Audit Log', {
      action,
      details,
      userId,
      timestamp: new Date().toISOString(),
      ip: 'system'
    });
  },

  error: (action: string, details: any, userId?: string) => {
    logger.error('Audit Log', {
      action,
      details,
      userId,
      timestamp: new Date().toISOString(),
      ip: 'system'
    });
  }
};

// Add performance logging
export const performanceLogger = {
  start: (operation: string) => {
    const startTime = Date.now();
    return {
      operation,
      startTime,
      end: () => {
        const duration = Date.now() - startTime;
        logger.info('Performance', {
          operation,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        return duration;
      }
    };
  }
};

// Add security logging
export const securityLogger = {
  login: (userId: string, ip: string, success: boolean, details?: any) => {
    logger.info('Security Event', {
      event: 'login',
      userId,
      ip,
      success,
      details,
      timestamp: new Date().toISOString()
    });
  },

  query: (userId: string, query: string, success: boolean, details?: any) => {
    logger.info('Security Event', {
      event: 'query',
      userId,
      query: query.substring(0, 100), // Limit query length in logs
      success,
      details,
      timestamp: new Date().toISOString()
    });
  },

  access: (userId: string, resource: string, action: string, success: boolean) => {
    logger.info('Security Event', {
      event: 'access',
      userId,
      resource,
      action,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// Export default logger for backward compatibility
export default logger;
