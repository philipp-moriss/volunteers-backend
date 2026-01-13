import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { expiresAccessIn, expiresRefreshIn } from 'src/shared/constants';
import { UserRole } from 'src/shared/user/type';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateAccessToken(
    userId: string,
    role: UserRole,
    phoneOrEmail: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        userId,
        role,
        phoneOrEmail,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: expiresAccessIn,
      },
    );
  }

  async generateRefreshToken(
    userId: string,
    role: UserRole,
    phoneOrEmail: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        userId,
        role,
        phoneOrEmail,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET_REFRESH'),
        expiresIn: expiresRefreshIn,
      },
    );
  }

  async verifyRefreshToken(refreshToken: string): Promise<{
    userId: string;
    role: UserRole;
    phoneOrEmail: string;
  }> {
    return this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get<string>('JWT_SECRET_REFRESH'),
    });
  }

  async verifyAccessToken(accessToken: string): Promise<{
    userId: string;
    role: UserRole;
    phoneOrEmail: string;
  }> {
    return this.jwtService.verifyAsync(accessToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }
}
