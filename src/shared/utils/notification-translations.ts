/**
 * Переводы для push-уведомлений
 */
export const notificationTranslations = {
  en: {
    taskResponse: {
      title: 'New Response to Your Task',
      body: (taskTitle: string) => `Someone responded to your task "${taskTitle}"`,
    },
    responseApproved: {
      title: 'Response Approved',
      body: (taskTitle: string) => `Your response to task "${taskTitle}" has been approved`,
    },
    responseRejected: {
      title: 'Response Rejected',
      body: (taskTitle: string) => `Your response to task "${taskTitle}" has been rejected`,
    },
  },
  he: {
    taskResponse: {
      title: 'תגובה חדשה למשימה שלך',
      body: (taskTitle: string) => `מישהו הגיב למשימה שלך "${taskTitle}"`,
    },
    responseApproved: {
      title: 'תגובה אושרה',
      body: (taskTitle: string) => `התגובה שלך למשימה "${taskTitle}" אושרה`,
    },
    responseRejected: {
      title: 'תגובה נדחתה',
      body: (taskTitle: string) => `התגובה שלך למשימה "${taskTitle}" נדחתה`,
    },
  },
  ru: {
    taskResponse: {
      title: 'Новый отклик на вашу задачу',
      body: (taskTitle: string) => `Кто-то откликнулся на вашу задачу "${taskTitle}"`,
    },
    responseApproved: {
      title: 'Отклик одобрен',
      body: (taskTitle: string) => `Ваш отклик на задачу "${taskTitle}" был одобрен`,
    },
    responseRejected: {
      title: 'Отклик отклонен',
      body: (taskTitle: string) => `Ваш отклик на задачу "${taskTitle}" был отклонен`,
    },
  },
};

export type SupportedLanguage = keyof typeof notificationTranslations;

/**
 * Получить переводы для указанного языка (по умолчанию 'en')
 */
export function getNotificationTranslations(language?: string) {
  const lang = (language || 'en') as SupportedLanguage;
  return notificationTranslations[lang] || notificationTranslations.en;
}
