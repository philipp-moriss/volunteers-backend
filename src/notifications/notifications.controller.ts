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
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { UserRole } from 'src/shared/user/type';
import { PushNotificationService } from './push-notification.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
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

  @Post('test-public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Публичный тестовый эндпоинт для отправки push-уведомлений всем подписанным пользователям (без авторизации)' })
  async testNotificationPublic(@Body() body?: { title?: string; body?: string }) {
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

  @Get('test-public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Публичный тестовый эндпоинт для отправки push-уведомлений (GET запрос, без авторизации)' })
  async testNotificationPublicGet() {
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

  @Get('subscriptions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Получить список подписок текущего пользователя' })
  async getUserSubscriptions(@GetUserMetadata() user: UserMetadata) {
    const subscriptions = await this.pushNotificationService.getUserSubscriptions(
      user.userId,
    );

    return {
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        endpoint: sub.endpoint.substring(0, 50) + '...',
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
    };
  }

  @Get('subscriptions/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Получить список всех подписок (только для админа)' })
  async getAllSubscriptions() {
    const subscriptions = await this.pushNotificationService.getAllSubscriptions();

    return {
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        user: sub.user
          ? {
              id: sub.user.id,
              email: sub.user.email,
              firstName: sub.user.firstName,
              lastName: sub.user.lastName,
            }
          : null,
        endpoint: sub.endpoint.substring(0, 50) + '...',
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
    };
  }

  @Get('subscriptions/stats')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Получить статистику подписок (только для админа)' })
  async getSubscriptionsStats() {
    const stats = await this.pushNotificationService.getSubscriptionsStats();

    return {
      success: true,
      stats,
    };
  }
}
