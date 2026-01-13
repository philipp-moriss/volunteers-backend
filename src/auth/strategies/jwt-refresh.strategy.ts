import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../shared/user/type';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET_REFRESH');
    if (!secret) {
      throw new Error('JWT_SECRET_REFRESH is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: {
    userId: string;
    role: UserRole;
    phoneOrEmail: string;
  }) {
    return payload;
  }
}
