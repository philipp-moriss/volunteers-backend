# Локальное тестирование Push-уведомлений

## Быстрый старт

### 1. Настройка VAPID ключей

Добавьте в `.env` файл бэкенда:
```env
VAPID_PUBLIC_KEY=BKP4nVBVZ-m0ova4J_SNOggRWXBA73XiJoFjlWaut2YgefWq4QqMrJoa-GnS1QmBs6c0jtdijRd3yqU1wdGPmMY
VAPID_PRIVATE_KEY=JQYUNjXLDTq-3MkHP_IeJW37iRH9DPh1FMYyqk7xBEo
VAPID_SUBJECT=mailto:test@example.com
```

Добавьте в `.env` файл фронтенда:
```env
VITE_VAPID_PUBLIC_KEY=BKP4nVBVZ-m0ova4J_SNOggRWXBA73XiJoFjlWaut2YgefWq4QqMrJoa-GnS1QmBs6c0jtdijRd3yqU1wdGPmMY
VITE_API_URL=http://localhost:3001
```

### 2. Запуск бэкенда

```bash
cd volunteers-backend
yarn start:dev
```

Бэкенд запустится на `http://localhost:3001` (или порт из `PORT` в .env)

### 3. Запуск фронтенда

```bash
cd volunteers-front
yarn dev
```

Фронтенд запустится на `http://localhost:3000`

### 4. Тестирование

1. Откройте `http://localhost:3000` в браузере (Chrome/Edge/Firefox)
2. Авторизуйтесь в приложении
3. Разрешите уведомления при запросе браузера
4. Подписка на push-уведомления произойдет автоматически
5. Создайте новую таску или выполните действие, которое должно отправить уведомление

## Проверка работы

### В консоли браузера (F12):
- Проверьте, что Service Worker зарегистрирован
- Проверьте, что подписка создана (в Application → Service Workers)
- Проверьте, что запрос на `/notifications/subscribe` выполнен успешно

### В консоли бэкенда:
- Проверьте логи отправки уведомлений
- При ошибках будут выведены детали

## Отладка

### Если уведомления не приходят:

1. **Проверьте разрешения браузера:**
   - Chrome: `chrome://settings/content/notifications`
   - Firefox: `about:preferences#privacy` → Уведомления

2. **Проверьте Service Worker:**
   - Chrome DevTools → Application → Service Workers
   - Убедитесь, что SW активен и работает

3. **Проверьте подписку:**
   - Chrome DevTools → Application → Storage → IndexedDB
   - Или проверьте в базе данных таблицу `push_subscriptions`

4. **Проверьте VAPID ключи:**
   - Убедитесь, что ключи одинаковые в бэкенде и фронтенде
   - Публичный ключ должен совпадать

5. **Проверьте логи бэкенда:**
   - При отправке уведомлений будут логи
   - Ошибки будут выведены в консоль

## Генерация новых ключей

Если нужно сгенерировать новые ключи:
```bash
cd volunteers-backend
npx ts-node src/notifications/scripts/generate-vapid-keys.ts
```

## Важные замечания

- **localhost считается безопасным контекстом** - HTTPS не требуется
- **Для продакшена обязательно нужен HTTPS**
- **iOS Safari**: Push-уведомления работают только если PWA установлено на домашний экран (iOS 16.4+)
- **Chrome/Edge/Firefox**: Полная поддержка на desktop и Android
