import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { PushTokenService } from './push-token.service';
import { FcmService } from 'src/fcm/fcm.service';
import { RegisterFcmDto } from './dto/register-fcm.dto';
import { TestFcmDto } from './dto/test-fcm.dto';

@ApiTags('push')
@Controller('push')
export class PushTokenController {
  private readonly logger = new Logger(PushTokenController.name);

  constructor(
    private readonly pushTokenService: PushTokenService,
    private readonly fcmService: FcmService,
  ) {}

  @Get('fcm/tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Список всех FCM токенов (открытый для тестирования)' })
  async getAllFcmTokens() {
    const tokens = await this.pushTokenService.getAllFcmTokens();
    return {
      success: true,
      count: tokens.length,
      tokens: tokens.map((t) => ({
        id: t.id,
        userId: t.userId,
        platform: t.platform,
        token: t.token,
        deviceId: t.deviceId,
        lastSeenAt: t.lastSeenAt,
        user: t.user
          ? {
              id: t.user.id,
              email: t.user.email,
              firstName: t.user.firstName,
              lastName: t.user.lastName,
            }
          : null,
      })),
    };
  }

  @Post('fcm/register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Регистрация FCM токена для iOS' })
  async registerFcm(
    @GetUserMetadata() user: UserMetadata,
    @Body() dto: RegisterFcmDto,
  ) {
    await this.pushTokenService.registerFcm(
      user.userId,
      dto.token,
      dto.platform,
      dto.deviceId,
    );
    return { success: true };
  }

  @Post('test/fcm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Тестовая отправка push на FCM токен (открытый для тестирования)' })
  async testFcm(@Body() body: TestFcmDto) {
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Missing or invalid "token" in request body');
    }
    const result = await this.fcmService.sendNotificationToDevice(
      token,
      body.title ?? 'Test FCM',
      body.body ?? 'Test notification from backend',
      JSON.stringify({ type: 'test', timestamp: new Date().toISOString() }),
    );

    this.logger.log(
      `POST /push/test/fcm success=${result.success} ${result.success ? `messageId=${result.messageId}` : `error=${result.error}`}`,
    );

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      platform: 'ios',
    };
  }
}
