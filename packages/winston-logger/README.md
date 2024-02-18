# nestlibs-winston-logger

This is a simple wrapper around the [winston](https://www.npmjs.com/package/winston) logger.
It provides daily log rotation and a simple way to log messages in NestJS applications.

## Installation

```bash
npm install @nestlibs/winston-logger
```

## Usage

```typescript
import { LoggerModule } from '@nestlibs/winston-logger';

@Module({
  imports: [LoggerModule.forRoot('appName')],
})
export class AppModule {}
```

```typescript
import { LoggerService } from '@nestlibs/winston-logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.info('Hello World!');
  }
}
```
