import * as webpush from 'web-push';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/**
 * Генерация VAPID ключей для Web Push API
 * Вызывать один раз для получения ключей, затем сохранить в .env
 */
export function generateVapidKeys(): VapidKeys {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  };
}

/**
 * Настройка VAPID для web-push
 */
export function setVapidDetails(
  publicKey: string,
  privateKey: string,
  subject: string,
): void {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}
