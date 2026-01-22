import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { User } from 'src/user/entities/user.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Skill } from 'src/skills/entities/skill.entity';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
  ttl?: number; // Time to live в секундах для Web Push (опционально)
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
  ) {}

  /**
   * Сохранение подписки пользователя
   */
  async saveSubscription(
    userId: string,
    endpoint: string,
    keys: { p256dh: string; auth: string },
  ): Promise<PushSubscription> {
    // Проверяем существующую подписку с таким endpoint
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint, userId },
    });

    if (existing) {
      existing.p256dh = keys.p256dh;
      existing.auth = keys.auth;
      return this.subscriptionRepository.save(existing);
    }

    const subscription = this.subscriptionRepository.create({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Удаление подписки пользователя
   */
  async removeSubscription(userId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      await this.subscriptionRepository.delete({ userId, endpoint });
    } else {
      await this.subscriptionRepository.delete({ userId });
    }
  }

  /**
   * Получение подписок пользователя
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получение всех подписок (для админа)
   */
  async getAllSubscriptions(): Promise<PushSubscription[]> {
    return this.subscriptionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получение статистики подписок
   */
  async getSubscriptionsStats(): Promise<{
    total: number;
    uniqueUsers: number;
  }> {
    const total = await this.subscriptionRepository.count();
    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .getRawOne();

    return {
      total,
      uniqueUsers: result ? parseInt(result.count, 10) || 0 : 0,
    };
  }

  /**
   * Отправка уведомления одному пользователю
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscriptions found for user ${userId}`);
      return;
    }

    await this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправка уведомления нескольким пользователям
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const subscriptions = await this.subscriptionRepository.find({
      where: { userId: In(userIds) },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscriptions found for users ${userIds.join(', ')}`);
      return;
    }

    await this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправка уведомления волонтерам с подходящими навыками
   */
  async sendToVolunteersBySkills(
    skillIds: string[],
    programId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    if (skillIds.length === 0) return;

    // Находим волонтеров с нужными навыками в программе
    const volunteers = await this.volunteerRepository
      .createQueryBuilder('volunteer')
      .innerJoin('volunteer.skills', 'skill')
      .where('volunteer.programId = :programId', { programId })
      .andWhere('skill.id IN (:...skillIds)', { skillIds })
      .getMany();

    if (volunteers.length === 0) {
      this.logger.debug(
        `No volunteers found with skills ${skillIds.join(', ')} in program ${programId}`,
      );
      return;
    }

    const userIds = volunteers.map((v) => v.userId);
    await this.sendToUsers(userIds, payload);
  }

  /**
   * Отправка уведомления всем подписанным пользователям
   */
  async sendToAll(payload: NotificationPayload): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find();
    
    if (subscriptions.length === 0) {
      this.logger.debug('No subscriptions found');
      return;
    }

    this.logger.log(`Sending test notification to ${subscriptions.length} subscribers`);
    await this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Отправка уведомлений по подпискам
   */
  private async sendToSubscriptions(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
  ): Promise<void> {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      data: payload.data || {},
      tag: payload.tag,
    });

    // Подготовка опций для webpush (TTL в секундах)
    const pushOptions: webpush.RequestOptions = {};
    if (payload.ttl !== undefined && payload.ttl >= 0) {
      pushOptions.TTL = payload.ttl;
      this.logger.debug(`Using TTL: ${payload.ttl} seconds`);
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            pushPayload,
            pushOptions,
          );
          this.logger.debug(
            `Notification sent to ${subscription.endpoint.substring(0, 50)}...`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notification to ${subscription.endpoint}: ${error.message}`,
          );

          // Удаляем невалидные подписки
          if (
            error.statusCode === 410 || // Gone
            error.statusCode === 404 // Not Found
          ) {
            await this.subscriptionRepository.delete({ id: subscription.id });
            this.logger.debug(
              `Removed invalid subscription ${subscription.id}`,
            );
          }

          throw error;
        }
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `Failed to send ${failed} out of ${subscriptions.length} notifications`,
      );
    }
  }
}
