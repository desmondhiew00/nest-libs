# nestlibs-jwt-auth

This package is for self use. Feel free to use it if you find it useful.\
It provides a simple and easy to use JWT authentication module for NestJS.

## Installation

```bash
# required packages
npm install @nestjs/jwt @nestjs/passport passport passport-jwt

# install the package
npm install nestlibs-jwt-auth
```

## Usage

Import the `JwtAuthModule` in your root module and call the `forRoot` method with the module name and the configuration object.

```typescript
import { JwtAuthModule } from 'nestlibs-jwt-auth';

@Module({
  imports: [
    JwtAuthModule.forRoot('main-auth', {
      accessTokenSecret: 'access-token-secret',
      refreshTokenSecret: 'refresh-token-secret',
      strategyConfig: {
        validate: (_req, payload) => {
          console.log('Jwt payload: ', payload);
          return payload;
        },
      },
    }),
  ],
})
export class AppModule {}
```

### Generate Guards and Decorators

```typescript
import { generateJwtAuthGuard } from 'nestlibs-jwt-auth';

export const { JwtAuthGuard, UseJwtAuthGuard, UseAuthUser } =
  generateJwtAuthGuard('main');
```

### Use the Guards and Decorators

app.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common';
import { UseJwtAuthGuard } from '../auth';

@Controller()
export class UserController {
  constructor(private prisma: PrismaService) {}

  @UseJwtAuthGuard()
  @Get('users')
  async getUsers(@UseAuthUser() user: User) {
    return this.prisma.user.findMany();
  }
}
```

app.resolver.ts

```typescript
import { Resolver, Query } from '@nestjs/graphql';
import { UseJwtAuthGuard } from '../auth';

@Resolver()
export class UserResolver {
  constructor(private prisma: PrismaService) {}

  @UseJwtAuthGuard()
  @Query(() => [User])
  async users(@UseAuthUser() user: User) {
    return this.prisma.user.findMany();
  }
}
```

## JwtAuthService

```typescript
import { InjectJwtAuthService, JwtAuthService } from 'nestlibs-jwt-auth';

@Injectable()
export class AppService {
  constructor(
    @InjectJwtAuthService('main-auth')
    private readonly jwtAuthService: JwtAuthService
  ) {}

  async login() {
    const isPasswordValid = true;
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    const accessToken = await this.jwtAuthService.generateAccessToken({ id: 1 });
    const refreshToken = await this.jwtAuthService.generateRefreshToken({ id: 1 });
    ...
  }
}
```

### JwtAuthService API

#### sign(payload: T, options?: JwtSignOptions): Promise&lt;string>

Signs the payload and returns the token.

#### verify(token: string, secret: string): Promise&lt;T>

Verifies the token and returns the payload.

#### decode(token: string): Promise&lt;T>

Decodes the token and returns the payload.

#### generateAccessToken(data: T, options?: JwtSignOptions): Promise&lt;string>

Generates an access token and returns the token.

#### generateRefreshToken(data: T, options?: JwtSignOptions): Promise&lt;string>

Generates a refresh token and returns the token.

#### verifyAccessToken(token: string): Promise&lt;T>

Verifies the access token and returns the payload.

#### verifyRefreshToken(token: string): Promise&lt;T>

Verifies the refresh token and returns the payload.
