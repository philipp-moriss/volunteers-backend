import { generateVapidKeys } from '../utils/vapid.util';

/**
 * Скрипт для генерации VAPID ключей
 * Запуск: npx ts-node src/notifications/scripts/generate-vapid-keys.ts
 */
function main() {
  console.log('Generating VAPID keys...\n');
  
  const keys = generateVapidKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('Add these to your .env files:\n');
  console.log('Backend (.env):');
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:your-email@example.com\n`);
  console.log('Frontend (.env):');
  console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
  console.log('⚠️  Keep the private key secure and never commit it to version control!');
}

main();
