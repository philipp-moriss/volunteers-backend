import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { SendSmsDto } from '../dto/send-sms.dto';
import { VerifySmsDto } from '../dto/verify-sms.dto';
import { RefreshTokensDto } from '../dto/refresh-tokens.dto';
import { UpdateUserDto } from '../../user/dto/update-user.dto';

interface AuthenticatedRequest extends Request {
  user: UserMetadata;
}

@ApiTags('Auth - User')
@Controller('auth/user')
export class UserAuthController {
  constructor(private authService: AuthService) {}

  // ==================== SMS AUTHENTICATION ====================

  @Post('sms/send')
  @ApiOperation({ summary: 'Отправить SMS с кодом верификации' })
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    return this.authService.sendSms(sendSmsDto.phoneNumber, sendSmsDto.isDev);
  }

  @Post('sms/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверить SMS код и авторизоваться' })
  async verifySms(@Body() verifySmsDto: VerifySmsDto, @Req() req: Request) {
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return this.authService.authenticateWithSms(
      verifySmsDto.phoneNumber,
      verifySmsDto.code,
      ipAddress,
    );
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
  async logout(@Req() req: AuthenticatedRequest) {
    await this.authService.logout(req.user.userId);
    return { message: 'Успешный выход' };
  }

  @Post('validate-refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Проверить валидность refresh token' })
  @ApiResponse({ status: 200, description: 'Token валиден' })
  @ApiResponse({ status: 401, description: 'Token недействителен' })
  async validateRefreshToken(@Body() body: { refreshToken: string }) {
    const isValid = await this.authService.validateRefreshToken(
      body.refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token недействителен');
    }
    return { valid: true };
  }

  // ==================== USER PROFILE ====================

  @ApiBearerAuth('JWT')
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить данные текущего пользователя с расширенной информацией по роли' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя с расширенной информацией (volunteer/needy/admin данные в зависимости от роли)',
  })
  getProfile(@GetUserMetadata() user: UserMetadata) {
    return this.authService.getMe(user);
  }

  @ApiBearerAuth('JWT')
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Обновить данные текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя обновлены',
  })
  updateProfile(
    @GetUserMetadata() user: UserMetadata,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateMe(user, updateUserDto);
  }
}
