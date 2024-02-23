import { Inject, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtAuthConfig } from './auth.module';

@Injectable()
export class JwtAuthService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;

  constructor(@Inject('JWT_AUTH_CONFIG') private authConfig: JwtAuthConfig, private jwtService: JwtService) {
    this.accessTokenSecret = this.authConfig.accessTokenSecret;
    this.refreshTokenSecret = this.authConfig.refreshTokenSecret;
  }

  async sign(payload: any, options?: JwtSignOptions) {
    return this.jwtService.sign(payload, options);
  }

  async verify(token: string, secret: string) {
    return this.jwtService.verify(token, { secret });
  }

  async decode(token: string) {
    return this.jwtService.decode(token, { complete: true });
  }

  async generateAccessToken(data: any, options: JwtSignOptions = { expiresIn: '1h' }) {
    return await this.sign(data, { ...options, secret: this.accessTokenSecret });
  }

  async generateRefreshToken(data: any, options: JwtSignOptions = { expiresIn: '7d' }) {
    return await this.sign(data, { ...options, secret: this.refreshTokenSecret });
  }

  async verifyAccessToken(token: string) {
    return this.verify(token, this.accessTokenSecret);
  }

  async verifyRefreshToken(token: string) {
    return this.verify(token, this.refreshTokenSecret);
  }
}
