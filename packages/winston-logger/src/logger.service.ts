import {
  Injectable,
  LoggerService as NestLogger,
} from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export type LogError = string | Error;

export interface Options extends winston.LoggerOptions {
  logMaxSize?: string;
  logMaxFiles?: string;
}

@Injectable()
export class LoggerService implements NestLogger {
  private logger: winston.Logger;
  private logMaxSize = '20m';
  private logMaxFiles = '30d';

  private readonly excludeContexts = new Set([
    'NestApplication',
    'NestFactory',
    'RoutesResolver',
    'RouterExplorer',
    'GraphQLModule',
  ]);
  private readonly excludeExceptions = new Set([
    'NotFoundException',
    'UnauthorizedException',
    'ForbiddenException',
  ]);

  constructor(appName: string, options?: Options) {
    const dirname = `logs${appName ? `/${appName}` : ''}`;

    if (options?.logMaxSize) this.logMaxSize = options.logMaxSize;
    if (options?.logMaxFiles) this.logMaxFiles = options.logMaxFiles;

    this.logger = winston.createLogger({
      format: this.getLogFormat(),
      transports: [
        this.createRotateTransport('debug', '%DATE%.log', dirname),
        this.createRotateTransport('error', 'error-%DATE%.log', dirname),
      ],
      ...options,
    });

    if (process.env['NODE_ENV'] !== 'production') {
      this.logger.add(this.createConsoleTransport());
    }
  }

  private getLogFormat() {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        const formattedMessage = stack ? `${message}\n${stack}` : message;
        return `[${timestamp}] [${level}] ${formattedMessage}`;
      })
    );
  }

  private createRotateTransport(level: string, filename: string, dirname: string) {
    return new winston.transports.DailyRotateFile({
      level,
      datePattern: 'YYYY-MM-DD',
      filename,
      dirname,
      maxSize: this.logMaxSize || '20m',
      maxFiles: this.logMaxFiles || '30d',
    });
  }

  private createConsoleTransport() {
    return new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const formattedMessage = stack ? `${message}\n${stack}` : message;
          return `[${timestamp}] [${level}] ${formattedMessage}`;
        })
      ),
    });
  }

  private shouldExcludeContext(context?: string): boolean {
    return context ? this.excludeContexts.has(context) : false;
  }

  private shouldExcludeException(exception?: string): boolean {
    return exception ? this.excludeExceptions.has(exception) : false;
  }

  public log(message: LogError, context?: string) {
    if (this.shouldExcludeContext(context)) return;
    this.logger.info(message.toString());
  }

  public error(message: LogError, trace?: string) {
    if (message instanceof Error) {
      message = message.message;
    }

    const exception = trace?.split(':')[0];
    if (this.shouldExcludeException(exception)) {
      trace = undefined;
    }

    this.logger.error(`${exception ? `[${exception}] ` : ''}${message}`, { stack: trace });
  }

  public warn(message: LogError) {
    this.logger.warn(message.toString());
  }

  public debug(message: LogError) {
    this.logger.debug(message.toString());
  }

  public verbose(message: LogError) {
    this.logger.verbose(message.toString());
  }
}
