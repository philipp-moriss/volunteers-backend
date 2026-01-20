import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PushSubscription } from './entities/push-subscription.entity';
import { User } from 'src/user/entities/user.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { PushNotificationService } from './push-notification.service';
import { NotificationsController } from './notifications.controller';
import { setVapidDetails } from './utils/vapid.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription, User, Volunteer]),
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [
    PushNotificationService,
    {
      provide: 'VAPID_INIT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const publicKey = configService.get<string>('VAPID_PUBLIC_KEY');
        const privateKey = configService.get<string>('VAPID_PRIVATE_KEY');
        const subject = configService.get<string>('VAPID_SUBJECT');

        if (publicKey && privateKey && subject) {
          setVapidDetails(publicKey, privateKey, subject);
          return true;
        } else {
          console.warn(
            'VAPID keys not configured. Push notifications will not work.',
          );
          return false;
        }
      },
    },
  ],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
