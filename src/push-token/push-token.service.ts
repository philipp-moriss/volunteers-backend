import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushToken } from './entities/push-token.entity';

@Injectable()
export class PushTokenService {
  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
  ) {}

  async registerFcm(
    userId: string,
    token: string,
    platform: string,
    deviceId?: string,
    deviceType?: string,
    userAgent?: string,
  ): Promise<PushToken> {
    const existing = await this.pushTokenRepository.findOne({
      where: { token },
    });

    const now = new Date();

    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.deviceId = deviceId ?? existing.deviceId;
      existing.deviceType = deviceType ?? existing.deviceType;
      existing.userAgent = userAgent ?? existing.userAgent;
      existing.isActive = true;
      existing.lastSeenAt = now;
      return this.pushTokenRepository.save(existing);
    }

    const pushToken = this.pushTokenRepository.create({
      userId,
      token,
      platform,
      deviceId: deviceId ?? null,
      deviceType: deviceType ?? null,
      userAgent: userAgent ?? null,
      isActive: true,
      lastSeenAt: now,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async getFcmTokensByUserIds(userIds: string[]): Promise<PushToken[]> {
    if (userIds.length === 0) return [];

    return this.pushTokenRepository.find({
      where: { userId: In(userIds), isActive: true },
    });
  }

  async getAllFcmTokens(): Promise<PushToken[]> {
    return this.pushTokenRepository.find({
      where: { isActive: true },
      relations: ['user'],
      order: { lastSeenAt: 'DESC' },
    });
  }
}
