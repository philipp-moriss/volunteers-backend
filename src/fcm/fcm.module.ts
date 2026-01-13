import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FcmService } from './fcm.service';

const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    // Проверяем наличие обязательных ключей
    const requiredKeys = {
      PROJECT_ID: configService.get<string>('PROJECT_ID'),
      PRIVATE_KEY: configService.get<string>('PRIVATE_KEY'),
      CLIENT_EMAIL: configService.get<string>('CLIENT_EMAIL'),
    };

    const missingKeys = Object.entries(requiredKeys)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      console.warn(
        `[FCM Module] ⚠️ Firebase конфигурация неполная. Отсутствуют ключи: ${missingKeys.join(', ')}. FCM уведомления будут недоступны.`,
      );
      // Возвращаем null вместо инициализации Firebase
      // FcmService должен обработать этот случай
      return null;
    }

    const firebaseConfig = {
      type: configService.get<string>('TYPE'),
      project_id: requiredKeys.PROJECT_ID,
      private_key_id: configService.get<string>('PRIVATE_KEY_ID'),
      private_key: requiredKeys.PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: requiredKeys.CLIENT_EMAIL,
      client_id: configService.get<string>('CLIENT_ID'),
      auth_uri: configService.get<string>('AUTH_URI'),
      token_uri: configService.get<string>('TOKEN_URI'),
      auth_provider_x509_cert_url: configService.get<string>('AUTH_CERT_URL'),
      client_x509_cert_url: configService.get<string>('CLIENT_CERT_URL'),
      universe_domain: configService.get<string>('UNIVERSAL_DOMAIN'),
    } as admin.ServiceAccount;

    try {
      return admin.initializeApp({
        credential: admin.credential?.cert(firebaseConfig),
      });
    } catch (error) {
      console.error(
        `[FCM Module] ❌ Ошибка инициализации Firebase: ${error.message}`,
      );
      return null;
    }
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FcmService, firebaseProvider],
  exports: [FcmService],
})
export class FcmModule {}
