import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../shared/user/type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    userId: string;
    role: UserRole;
    phoneOrEmail: string;
  }) {
    const user = await this.userService.findById(payload.userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      userId: user.id,
      role: user.role,
      phoneOrEmail: user.phone || user.email || '',
      phone: user.phone,
      email: user.email,
    };
  }
}
