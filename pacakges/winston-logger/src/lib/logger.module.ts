import { Global, Module } from '@nestjs/common';
import { DynamicModule } from '@nestjs/common';

import { LoggerService } from './logger.service';
import { LoggerOptions } from 'winston';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(appName: string, options?: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [{ provide: LoggerService, useValue: new LoggerService(appName, options) }],
      exports: [LoggerService]
    };
  }
}
