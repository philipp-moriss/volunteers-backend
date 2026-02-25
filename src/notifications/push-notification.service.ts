import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { User } from 'src/user/entities/user.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import type { SupportedLanguage } from 'src/shared/utils/notification-translations';

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
   * Сохранение подписки пользователя.
   * Оставляем одну подписку на пользователя (последнюю), чтобы не было дублей пушей.
   */
  async saveSubscription(
    userId: string,
    endpoint: string,
    keys: { p256dh: string; auth: string },
  ): Promise<PushSubscription> {
    const existingSameEndpoint = await this.subscriptionRepository.findOne({
      where: { endpoint, userId },
    });

    if (existingSameEndpoint) {
      existingSameEndpoint.p256dh = keys.p256dh;
      existingSameEndpoint.auth = keys.auth;
      return this.subscriptionRepository.save(existingSameEndpoint);
    }

    // Удаляем остальные подписки этого пользователя — одна подписка на пользователя, без лишних
    await this.subscriptionRepository.delete({ userId });

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
   * Отправка уведомлений с персональным языком: загружает язык каждого пользователя,
   * группирует по языку, для каждой группы формирует payload через getPayload и отправляет.
   */
  async sendToUsersWithLanguage(
    userIds: string[],
    getPayload: (lang: SupportedLanguage) => NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'language'],
    });

    const langGroups = new Map<string, string[]>();
    for (const user of users) {
      const lang = (user.language || 'he') as SupportedLanguage;
      const validLang = ['he', 'ru', 'en'].includes(lang) ? lang : 'he';
      const list = langGroups.get(validLang) ?? [];
      list.push(user.id);
      langGroups.set(validLang, list);
    }

    for (const [lang, ids] of langGroups) {
      const payload = getPayload(lang as SupportedLanguage);
      await this.sendToUsers(ids, payload);
    }
  }

  /**
   * Отправка уведомления волонтерам с подходящими навыками.
   * При передаче getPayloadByLanguage каждый получатель получает push на своём языке.
   */
  async sendToVolunteersBySkills(
    skillIds: string[],
    programId: string,
    payload: NotificationPayload,
    cityId?: string,
    getPayloadByLanguage?: (lang: SupportedLanguage) => NotificationPayload,
  ): Promise<void> {
    if (skillIds.length === 0) return;

    // Находим волонтеров с нужными навыками в программе
    let queryBuilder = this.volunteerRepository
      .createQueryBuilder('volunteer')
      .innerJoin('volunteer.skills', 'skill')
      .innerJoin('volunteer_programs', 'vp', 'vp.volunteer_id = volunteer.id')
      .where('vp.program_id = :programId', { programId })
      .andWhere('skill.id IN (:...skillIds)', { skillIds });

    // Фильтруем по городу, если указан
    if (cityId) {
      queryBuilder = queryBuilder.andWhere('volunteer.cityId = :cityId', { cityId });
    }

    const volunteers = await queryBuilder.getMany();

    if (volunteers.length === 0) {
      this.logger.debug(
        `No volunteers found with skills ${skillIds.join(', ')} in program ${programId}${cityId ? ` in city ${cityId}` : ''}`,
      );
      return;
    }

    const userIds = volunteers.map((v) => v.userId);
    if (getPayloadByLanguage) {
      await this.sendToUsersWithLanguage(userIds, getPayloadByLanguage);
    } else {
      await this.sendToUsers(userIds, payload);
    }
  }

  /**
   * Отправка уведомления всем волонтерам (менторам) программы.
   * При передаче getPayloadByLanguage каждый получатель получает push на своём языке.
   */
  async sendToAllProgramVolunteers(
    programId: string,
    payload: NotificationPayload,
    cityId?: string,
    getPayloadByLanguage?: (lang: SupportedLanguage) => NotificationPayload,
  ): Promise<void> {
    // Находим всех волонтеров программы
    let queryBuilder = this.volunteerRepository
      .createQueryBuilder('volunteer')
      .innerJoin('volunteer_programs', 'vp', 'vp.volunteer_id = volunteer.id')
      .where('vp.program_id = :programId', { programId });

    // Фильтруем по городу, если указан
    if (cityId) {
      queryBuilder = queryBuilder.andWhere('volunteer.cityId = :cityId', { cityId });
    }

    const volunteers = await queryBuilder.getMany();

    if (volunteers.length === 0) {
      this.logger.debug(
        `No volunteers found in program ${programId}${cityId ? ` in city ${cityId}` : ''}`,
      );
      return;
    }

    this.logger.debug(
      `Found ${volunteers.length} volunteers in program ${programId}${cityId ? ` in city ${cityId}` : ''}`,
    );

    const userIds = volunteers.map((v) => v.userId);
    if (getPayloadByLanguage) {
      await this.sendToUsersWithLanguage(userIds, getPayloadByLanguage);
    } else {
      await this.sendToUsers(userIds, payload);
    }
  }

  /**
   * Отправка уведомления «Задачу взял другой волонтёр» всем волонтёрам той же аудитории, что и при создании задачи (программа ± навыки ± город), кроме назначенного.
   * Вызывается только при назначении (approve/assign/firstResponseMode), не при создании задачи.
   * При передаче getPayloadByLanguage каждый получатель получает push на своём языке.
   */
  async sendTaskTakenToOtherVolunteers(
    programId: string,
    assignedVolunteerId: string,
    payload: NotificationPayload,
    options?: {
      skillIds?: string[];
      cityId?: string;
      getPayloadByLanguage?: (lang: SupportedLanguage) => NotificationPayload;
    },
  ): Promise<void> {
    let userIds: string[];

    if (options?.skillIds && options.skillIds.length > 0) {
      let queryBuilder = this.volunteerRepository
        .createQueryBuilder('volunteer')
        .innerJoin('volunteer.skills', 'skill')
        .innerJoin('volunteer_programs', 'vp', 'vp.volunteer_id = volunteer.id')
        .where('vp.program_id = :programId', { programId })
        .andWhere('skill.id IN (:...skillIds)', { skillIds: options.skillIds });
      if (options.cityId) {
        queryBuilder = queryBuilder.andWhere('volunteer.cityId = :cityId', {
          cityId: options.cityId,
        });
      }
      const volunteers = await queryBuilder.getMany();
      userIds = volunteers.map((v) => v.userId);
    } else {
      let queryBuilder = this.volunteerRepository
        .createQueryBuilder('volunteer')
        .innerJoin('volunteer_programs', 'vp', 'vp.volunteer_id = volunteer.id')
        .where('vp.program_id = :programId', { programId });
      if (options?.cityId) {
        queryBuilder = queryBuilder.andWhere('volunteer.cityId = :cityId', {
          cityId: options.cityId,
        });
      }
      const volunteers = await queryBuilder.getMany();
      userIds = volunteers.map((v) => v.userId);
    }

    const otherUserIds = userIds.filter((uid) => uid !== assignedVolunteerId);
    if (otherUserIds.length === 0) {
      this.logger.debug(
        `No other volunteers to notify for task taken (program ${programId}, assigned ${assignedVolunteerId})`,
      );
      return;
    }

    if (options?.getPayloadByLanguage) {
      await this.sendToUsersWithLanguage(otherUserIds, options.getPayloadByLanguage);
    } else {
      await this.sendToUsers(otherUserIds, payload);
    }
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
