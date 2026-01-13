import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EmailRegisterDto } from '../dto/email-register.dto';
import { EmailLoginDto } from '../dto/email-login.dto';
import { RefreshTokensDto } from '../dto/refresh-tokens.dto';

@ApiTags('Auth - Admin')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private authService: AuthService) {}

  // ==================== EMAIL AUTHENTICATION ====================

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Регистрация админа через email/password',
    description:
      'Создание нового администратора с авторизацией через email и пароль. Пароль хешируется перед сохранением в базу данных.',
  })
  async registerWithEmail(
    @Body() registerDto: EmailRegisterDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return this.authService.registerWithEmail(registerDto, ipAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Авторизация админа через email/password',
    description:
      'Вход в систему с использованием email и пароля. Возвращает JWT токены для дальнейшей авторизации.',
  })
  async loginWithEmail(@Body() loginDto: EmailLoginDto, @Req() req: Request) {
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return this.authService.authenticateWithEmail(loginDto, ipAddress);
  }

  // ==================== TOKEN MANAGEMENT ====================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить access token' })
  async refreshTokens(@Body() refreshTokensDto: RefreshTokensDto) {
    return this.authService.refreshTokens(
      refreshTokensDto.accessToken,
      refreshTokensDto.refreshToken,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы' })
  async logout(@Req() req: Request & { user: { userId: string } }) {
    await this.authService.logout(req.user.userId);
    return { message: 'Успешный выход' };
  }

  // ==================== ADMIN UTILITIES ====================

  @Post('sms/cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Очистить истекшие коды верификации' })
  async cleanupExpiredCodes() {
    await this.authService.cleanupExpiredCodes();
    return { message: 'Истекшие коды верификации очищены' };
  }
}
