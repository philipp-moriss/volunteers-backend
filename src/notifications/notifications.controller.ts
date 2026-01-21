import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { PushNotificationService } from './push-notification.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class NotificationsController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Подписка на push-уведомления' })
  async subscribe(
    @GetUserMetadata() user: UserMetadata,
    @Body() subscribeDto: SubscribeDto,
  ) {
    await this.pushNotificationService.saveSubscription(
      user.userId,
      subscribeDto.endpoint,
      subscribeDto.keys,
    );

    return { success: true };
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отписка от push-уведомлений' })
  async unsubscribe(
    @GetUserMetadata() user: UserMetadata,
    @Body('endpoint') endpoint?: string,
  ) {
    await this.pushNotificationService.removeSubscription(
      user.userId,
      endpoint,
    );
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Тестовая отправка push-уведомления всем подписанным пользователям' })
  async testNotification(@Body() body?: { title?: string; body?: string }) {
    await this.pushNotificationService.sendToAll({
      title: body?.title || 'Test Notification',
      body: body?.body || 'This is a test push notification from the backend',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      tag: 'test-notification',
    });

    return { 
      success: true, 
      message: 'Test notification sent to all subscribers' 
    };
  }

  @Get('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Тестовая отправка push-уведомления (GET запрос)' })
  async testNotificationGet() {
    await this.pushNotificationService.sendToAll({
      title: 'Test Notification',
      body: 'This is a test push notification from the backend',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      tag: 'test-notification',
    });

    return { 
      success: true, 
      message: 'Test notification sent to all subscribers' 
    };
  }
}
