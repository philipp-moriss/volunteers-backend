import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { FcmService } from './fcm.service';

const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    let serviceAccount: admin.ServiceAccount | null = null;

    const jsonEnv = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (jsonEnv) {
      try {
        serviceAccount = JSON.parse(jsonEnv) as admin.ServiceAccount;
        console.log('[FCM Module] Using credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (e) {
        console.error(
          `[FCM Module] ❌ FIREBASE_SERVICE_ACCOUNT_JSON invalid: ${e instanceof Error ? e.message : String(e)}`,
        );
        return null;
      }
    }

    if (!serviceAccount) {
      const jsonPath = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      if (jsonPath && fs.existsSync(jsonPath)) {
        try {
          serviceAccount = JSON.parse(
            fs.readFileSync(jsonPath, 'utf8'),
          ) as admin.ServiceAccount;
          console.log(`[FCM Module] Using credentials from file: ${jsonPath}`);
        } catch (e) {
          console.error(
            `[FCM Module] ❌ Firebase file parse error: ${e instanceof Error ? e.message : String(e)}`,
          );
          return null;
        }
      }
    }

    if (!serviceAccount) {
      console.warn(
        '[FCM Module] ⚠️ No credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH. FCM unavailable.',
      );
      return null;
    }

    try {
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(
        `[FCM Module] ✅ Firebase connected | projectId=${serviceAccount.projectId}`,
      );
      return app;
    } catch (error) {
      console.error(
        `[FCM Module] ❌ Firebase init error: ${error instanceof Error ? error.message : String(error)}`,
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
