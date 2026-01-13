import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { expiresAccessIn } from 'src/shared/constants';
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh.strategy';
import { VerificationCode } from './entities/verification-code.entity';
import { UserAuthController } from './controllers/user-auth.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([VerificationCode]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: expiresAccessIn },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserAuthController, AdminAuthController],
  providers: [AuthService, TokenService, JwtStrategy, JwtRefreshTokenStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
