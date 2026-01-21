import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Message } from 'firebase-admin/lib/messaging/messaging-api';

@Injectable()
export class FcmService {
  constructor(
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App | null,
  ) {}

  /**
   * Send notification to a single device
   * @param ttl Time to live in milliseconds (optional). If device is offline, message expires after this time.
   */
  async sendNotificationToDevice(
    deviceToken: string,
    title: string,
    body: string,
    payload: string,
    ttl?: number,
  ) {
    console.log(
      `[sendNotificationToDevice] START - token: ${deviceToken?.substring(0, 30)}..., title: ${title}, body: ${body?.substring(0, 50)}...`,
    );

    if (!this.firebaseApp) {
      console.warn(
        `[sendNotificationToDevice] Firebase не инициализирован. Проверьте конфигурацию Firebase.`,
      );
      return {
        success: false,
        error: 'Firebase не настроен. Проверьте переменные окружения.',
      };
    }

    if (
      !deviceToken ||
      typeof deviceToken !== 'string' ||
      deviceToken.trim().length === 0
    ) {
      console.error(
        `[sendNotificationToDevice] Invalid token - token: ${deviceToken}`,
      );
      return { success: false, error: 'Invalid device token' };
    }

    const message: Message = {
      data: {
        title: title,
        body: body,
        route: payload,
      },
      token: deviceToken.trim(),
      android: {
        priority: 'high',
        // TTL должен быть числом в миллисекундах (не строкой с "s")
        ...(ttl !== undefined && ttl >= 0 ? { ttl: ttl } : {}),
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': '10',
          // Для iOS также можно указать expiration через apns-expiration
          // Формат: Unix timestamp в секундах
          ...(ttl !== undefined && ttl >= 0 ? { 
            'apns-expiration': String(Math.floor(Date.now() / 1000) + Math.floor(ttl / 1000))
          } : {}),
        },
      },
    };

    // Определяем тип устройства по формату токена (iOS FCM токены обычно длиннее)
    const isLikelyIOS = deviceToken.length > 150;

    try {
      const response = await this.firebaseApp.messaging().send(message);
      console.log(
        `[sendNotificationToDevice] ✅ SUCCESS - token: ${deviceToken.substring(0, 30)}..., messageId: ${response}, deviceType: ${isLikelyIOS ? 'iOS' : 'Android/Other'}`,
      );
      return { success: true, messageId: response };
    } catch (error) {
      const errorDetails = {
        token: deviceToken.substring(0, 50) + '...',
        fullToken: deviceToken,
        error: error.message,
        code: error.code || 'unknown',
        deviceType: isLikelyIOS ? 'iOS (likely)' : 'Android/Other',
        isAPNSError: error.code === 'messaging/third-party-auth-error',
      };

      console.error(
        `[sendNotificationToDevice] ❌ ERROR - ${JSON.stringify(errorDetails)}`,
      );

      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        console.warn(
          `[sendNotificationToDevice] Invalid/expired token detected - token: ${deviceToken.substring(0, 30)}..., code: ${error.code}`,
        );
      }

      if (error.code === 'messaging/third-party-auth-error' && isLikelyIOS) {
        console.error(
          `[sendNotificationToDevice] ⚠️ APNS AUTH ERROR for iOS device! This usually means:
          1. APNS certificates not configured in Firebase Console
          2. Wrong APNS certificate type (dev vs production)
          3. For iOS dev builds, need APNS Sandbox certificate in Firebase
          4. Check Firebase Console -> Project Settings -> Cloud Messaging -> APNs Certificates
          Full token: ${deviceToken}`,
        );
      }

      return {
        success: false,
        error: error.message,
        code: error.code,
        deviceType: isLikelyIOS ? 'iOS' : 'Android/Other',
      };
    }
  }

  /**
   * Send notification to multiple devices
   * @param ttl Time to live in milliseconds (optional). If device is offline, message expires after this time.
   */
  async sendMulticastNotification(
    deviceTokens: string[],
    title: string,
    body: string,
    route: { [key: string]: string },
    ttl?: number,
  ) {
    console.log(
      `[sendMulticastNotification] START - tokensCount: ${deviceTokens?.length || 0}, title: ${title}`,
    );

    if (!this.firebaseApp) {
      console.warn(
        `[sendMulticastNotification] Firebase не инициализирован. Проверьте конфигурацию Firebase.`,
      );
      return deviceTokens.map((token) => ({
        token,
        success: false,
        error: 'Firebase не настроен. Проверьте переменные окружения.',
      }));
    }

    if (
      !deviceTokens ||
      !Array.isArray(deviceTokens) ||
      deviceTokens.length === 0
    ) {
      console.warn(
        `[sendMulticastNotification] No device tokens provided - tokens: ${JSON.stringify(deviceTokens)}`,
      );
      return [];
    }

    // Дополнительная фильтрация токенов
    const invalidTokens: Array<{ index: number; token: any; reason: string }> =
      [];
    const validTokens = deviceTokens.filter((token, index) => {
      if (!token) {
        invalidTokens.push({
          index,
          token: token,
          reason: 'token is null or undefined',
        });
        return false;
      }
      if (typeof token !== 'string') {
        invalidTokens.push({
          index,
          token: token,
          reason: `token is not a string (type: ${typeof token})`,
        });
        return false;
      }
      if (token.trim().length === 0) {
        invalidTokens.push({
          index,
          token: token,
          reason: 'token is empty string or whitespace only',
        });
        return false;
      }
      return true;
    });

    if (invalidTokens.length > 0) {
      console.warn(
        `[sendMulticastNotification] Invalid tokens filtered out - count: ${invalidTokens.length}, details: ${JSON.stringify(invalidTokens.map((t) => ({ index: t.index, reason: t.reason, tokenPreview: typeof t.token === 'string' ? t.token.substring(0, 30) + '...' : String(t.token).substring(0, 30) })))}`,
      );
    }

    if (validTokens.length === 0) {
      console.warn(
        `[sendMulticastNotification] No valid device tokens found after filtering - originalCount: ${deviceTokens.length}, invalidCount: ${invalidTokens.length}`,
      );
      return [];
    }

    if (validTokens.length !== deviceTokens.length) {
      console.warn(
        `[sendMulticastNotification] Token filtering summary - originalCount: ${deviceTokens.length}, validCount: ${validTokens.length}, invalidCount: ${invalidTokens.length}`,
      );
    }

    console.log(
      `[sendMulticastNotification] Sending to ${validTokens.length} devices - tokens: [${validTokens.map((t) => t.substring(0, 20) + '...').join(', ')}]`,
    );

    const results: Array<{
      token: string;
      success: boolean;
      error?: string;
      messageId?: string;
      code?: string;
      deviceType?: string;
    }> = [];
    for (let i = 0; i < validTokens.length; i++) {
      const token = validTokens[i];
      console.log(
        `[sendMulticastNotification] Sending to device ${i + 1}/${validTokens.length} - token: ${token.substring(0, 30)}...`,
      );

      try {
        const result = await this.sendNotificationToDevice(
          token,
          title || 'title',
          body || 'body',
          JSON.stringify(route),
          ttl,
        );
        results.push({ token: token, ...result });

        if (result.success) {
          console.log(
            `[sendMulticastNotification] ✅ Success - device ${i + 1}/${validTokens.length}, token: ${token.substring(0, 30)}..., messageId: ${result.messageId}`,
          );
        } else {
          console.error(
            `[sendMulticastNotification] ❌ Failed - device ${i + 1}/${validTokens.length}, token: ${token}, error: ${result.error}, code: ${result.code}`,
          );
        }
      } catch (error) {
        console.error(
          `[sendMulticastNotification] ❌ Exception - device ${i + 1}/${validTokens.length}, token: ${token}, error: ${error.message}, stack: ${error.stack}`,
        );
        results.push({
          token: token,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(
      `[sendMulticastNotification] END - total: ${results.length}, success: ${successCount}, failed: ${failCount}`,
    );

    return results;
  }
}
