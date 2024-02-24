# nestlibs-winston-logger

This package is for self use. Feel free to use it if you find it useful.\
A simple wrapper around the [winston](https://www.npmjs.com/package/winston) logger with [daily log rotation](https://www.npmjs.com/package/winston-daily-rotate-file)
To log messages to file in NestJS application.

## Installation

```bash
npm install nestlibs-winston-logger
```

## Usage

```typescript
import { LoggerModule } from '@nestlibs/winston-logger';

@Module({
  // appName will be used as logs folder name (logs/appName/***.log)
  imports: [LoggerModule.forRoot('appName', options)],
})
export class AppModule {}
```

```typescript
import { LoggerService } from '@nestlibs/winston-logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.log('Hello World!');
  }
}
```

## Options

- logMaxSize?: string; (default: 20m) - refer to [winston-daily-rotate-file](https://www.npmjs.com/package/winston-daily-rotate-file)
- logMaxFiles?: string; (default: 30d) - refer to [winston-daily-rotate-file](https://www.npmjs.com/package/winston-daily-rotate-file)
- verify?: (message: LogError) - custom validation function for log messages

## Methods

> type LogError = string | Error;

- log(message: LogError)
- info(message: LogError)
- error(message: LogError, trace?: string)
- warn(message: LogError)
- debug(message: LogError)
- verbose(message: LogError)
