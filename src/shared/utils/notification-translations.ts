/**
 * Переводы для push-уведомлений
 */
export const notificationTranslations = {
  en: {
    newTask: {
      title: 'New Task Available',
      body: (taskTitle: string) => taskTitle,
    },
    taskCompleted: {
      title: 'Task Completed',
      body: (taskTitle: string) => `Task "${taskTitle}" has been completed`,
    },
    taskStatusUpdated: {
      title: 'Task Status Updated',
      body: (taskTitle: string) => `Task "${taskTitle}" status has been updated`,
    },
    taskReadyForApproval: {
      title: 'Task Ready for Approval',
      body: (taskTitle: string) => `Volunteer has completed task "${taskTitle}". Please approve it.`,
    },
    taskCompletionPending: {
      title: 'Task Completion Pending',
      body: (taskTitle: string) =>
        `Volunteer has marked task "${taskTitle}" as completed. Please review and approve.`,
    },
    taskAssignmentCancelled: {
      title: 'Task Assignment Cancelled',
      body: (taskTitle: string) => `Assignment for task "${taskTitle}" has been cancelled`,
    },
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
    taskTakenByOther: {
      title: 'Task Taken',
      body: (taskTitle: string) => `Sorry, but another volunteer took the task "${taskTitle}"`,
    },
  },
  he: {
    newTask: {
      title: 'משימה חדשה זמינה',
      body: (taskTitle: string) => taskTitle,
    },
    taskCompleted: {
      title: 'המשימה הושלמה',
      body: (taskTitle: string) => `המשימה "${taskTitle}" הושלמה`,
    },
    taskStatusUpdated: {
      title: 'סטטוס המשימה עודכן',
      body: (taskTitle: string) => `סטטוס המשימה "${taskTitle}" עודכן`,
    },
    taskReadyForApproval: {
      title: 'המשימה מוכנה לאישור',
      body: (taskTitle: string) =>
        `המתנדב השלים את המשימה "${taskTitle}". אנא אשר אותה.`,
    },
    taskCompletionPending: {
      title: 'המתנה לאישור המשימה',
      body: (taskTitle: string) =>
        `המתנדב סימן את המשימה "${taskTitle}" כהושלמה. אנא בדוק ואשר.`,
    },
    taskAssignmentCancelled: {
      title: 'ההקצאה בוטלה',
      body: (taskTitle: string) => `ההקצאה למשימה "${taskTitle}" בוטלה`,
    },
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
    taskTakenByOther: {
      title: 'המשימה נלקחה',
      body: (taskTitle: string) => `מצטערים, מתנדב אחר לקח את המשימה "${taskTitle}"`,
    },
  },
  ru: {
    newTask: {
      title: 'Новая задача доступна',
      body: (taskTitle: string) => taskTitle,
    },
    taskCompleted: {
      title: 'Задача выполнена',
      body: (taskTitle: string) => `Задача "${taskTitle}" выполнена`,
    },
    taskStatusUpdated: {
      title: 'Статус задачи обновлён',
      body: (taskTitle: string) => `Статус задачи "${taskTitle}" обновлён`,
    },
    taskReadyForApproval: {
      title: 'Задача готова к подтверждению',
      body: (taskTitle: string) =>
        `Волонтёр выполнил задачу "${taskTitle}". Пожалуйста, подтвердите.`,
    },
    taskCompletionPending: {
      title: 'Ожидание подтверждения задачи',
      body: (taskTitle: string) =>
        `Волонтёр отметил задачу "${taskTitle}" как выполненную. Пожалуйста, проверьте и подтвердите.`,
    },
    taskAssignmentCancelled: {
      title: 'Назначение отменено',
      body: (taskTitle: string) => `Назначение на задачу "${taskTitle}" отменено`,
    },
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
    taskTakenByOther: {
      title: 'Задачу взял другой волонтёр',
      body: (taskTitle: string) => `Извините, но задачу "${taskTitle}" взял другой волонтёр`,
    },
  },
};

export type SupportedLanguage = keyof typeof notificationTranslations;

/**
 * Получить переводы для указанного языка (по умолчанию 'he')
 */
export function getNotificationTranslations(language?: string) {
  const lang = (language || 'he') as SupportedLanguage;
  return notificationTranslations[lang] || notificationTranslations.he;
}
