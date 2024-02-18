import {
  Injectable,
  LoggerService as NestLogger,
} from '@nestjs/common';

import * as winston from 'winston';
import 'winston-daily-rotate-file';

export type LogError = string | Error;

@Injectable()
export class LoggerService implements NestLogger {
  logger: winston.Logger;

  constructor(appName: string, options?: winston.LoggerOptions) {
    let dirname = 'logs';
    if (appName) dirname += `/${appName}`;

    const logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack } = info;
          const formattedMessage = stack ? `${message}\n${stack}` : message;
          return `[${timestamp}] [${level}] ${formattedMessage}`;
        })
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          level: 'debug',
          datePattern: 'YYYY-MM-DD',
          filename: '%DATE%.log',
          dirname,
          maxSize: '20m',
          maxFiles: '30d',
        }),
        new winston.transports.DailyRotateFile({
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          filename: 'error-%DATE%.log',
          dirname,
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
      ...options,
    });

    if (process.env['NODE_ENV'] !== 'production') {
      logger.add(
        new winston.transports.Console({
          level: 'debug',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => {
              const { timestamp, level, message, stack } = info;
              const formattedMessage = stack ? `${message}\n${stack}` : message;
              const colorizer = winston.format.colorize();
              const colorTimestamp = colorizer.colorize('info', timestamp);
              return `[${colorTimestamp}] [${level}] ${formattedMessage}`;
            })
          ),
        })
      );
    }

    this.logger = logger;
  }

  public log(message: LogError, context?: string) {
    const excludeContexts = [
      'NestApplication',
      'NestFactory',
      'RoutesResolver',
      'RouterExplorer',
      'GraphQLModule',
    ];
    if (context && excludeContexts.includes(context)) return;
    this.logger.log({
      level: 'info',
      message: `${message}`,
    });
  }

  public error(message: LogError, trace?: any) {
    if (message instanceof Error) message = message.message;
    let exception = undefined;
    if (trace) {
      exception = trace.split(':')[0];
      const excludeExceptions = [
        'NotFoundException',
        'UnauthorizedException',
        'ForbiddenException',
      ];
      if (excludeExceptions.includes(exception)) {
        trace = undefined;
      }
      exception = `[${exception}] `;
    }

    this.logger.log({
      level: 'error',
      message: `${exception || ''}${message}`,
      stack: trace,
    });
  }

  public warn(message: LogError) {
    this.logger.log({
      level: 'warn',
      message: `${message}`,
    });
  }

  public debug(message: LogError) {
    this.logger.log({
      level: 'debug',
      message: `${message}`,
    });
  }

  public verbose(message: LogError) {
    this.logger.log({
      level: 'verbose',
      message: `${message}`,
    });
  }
}
