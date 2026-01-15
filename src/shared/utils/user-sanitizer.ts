import { User } from 'src/user/entities/user.entity';
import { UserWithOutPassword } from 'src/user/types/user';

/**
 * Удаляет чувствительные данные (passwordHash, refreshTokenHash) из User объекта
 * @param user - User объект или undefined
 * @returns User объект без чувствительных данных или undefined
 */
export function sanitizeUser(user: User | undefined | null): UserWithOutPassword | undefined {
  if (!user) return undefined;
  
  const { passwordHash, refreshTokenHash, ...safeUser } = user;
  return safeUser as UserWithOutPassword;
}

/**
 * Рекурсивно очищает User объекты из массива
 * @param users - Массив User объектов
 * @returns Массив User объектов без чувствительных данных
 */
export function sanitizeUsers(users: (User | undefined | null)[]): UserWithOutPassword[] {
  return users
    .map(sanitizeUser)
    .filter((user): user is UserWithOutPassword => user !== undefined);
}

/**
 * Очищает User объект из вложенного объекта (например, из relation)
 * Полезно для очистки creator, user, createdByAdmin и других relations
 * @param obj - Объект, который может содержать User
 * @param userFieldName - Имя поля, содержащего User (по умолчанию 'user')
 * @returns Объект с очищенным User полем
 */
export function sanitizeNestedUser<T extends Record<string, any>>(
  obj: T | undefined | null,
  userFieldName: string = 'user',
): T | undefined {
  if (!obj) return undefined;
  
  if (userFieldName in obj && obj[userFieldName]) {
    const { [userFieldName]: user, ...rest } = obj;
    return {
      ...rest,
      [userFieldName]: sanitizeUser(user),
    } as T;
  }
  
  return obj;
}

/**
 * Очищает несколько User полей из объекта (например, creator и user)
 * @param obj - Объект, который может содержать несколько User полей
 * @param userFieldNames - Массив имен полей, содержащих User
 * @returns Объект с очищенными User полями
 */
export function sanitizeMultipleNestedUsers<T extends Record<string, any>>(
  obj: T | undefined | null,
  userFieldNames: string[],
): T | undefined {
  if (!obj) return undefined;
  
  return userFieldNames.reduce((acc, fieldName) => {
    if (fieldName in acc && acc[fieldName]) {
      return {
        ...acc,
        [fieldName]: sanitizeUser(acc[fieldName]),
      };
    }
    return acc;
  }, { ...obj } as T);
}
