import { Task } from '../entities/task.entity';

export interface NeedyContactShared {
  name: string;
  phone: string;
}

export interface TaskWithMyResponse extends Task {
  hasMyResponse: boolean;
  /** Контакт семьи (имя и телефон), если семья поделилась с волонтёром */
  needyContact?: NeedyContactShared | null;
}

