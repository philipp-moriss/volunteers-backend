import { Task } from '../entities/task.entity';

export interface TaskWithMyResponse extends Task {
  hasMyResponse: boolean;
}

