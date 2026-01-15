import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from 'src/user/entities/user.entity';
import { Program } from 'src/program/entities/program.entity';
import { TaskResponseStatus } from '../types/task-response-status.enum';

@Entity({ name: 'task_responses' })
export class TaskResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'task_id',
    type: 'uuid',
  })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({
    name: 'volunteer_id',
    type: 'uuid',
  })
  volunteerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: User;

  @Column({
    name: 'program_id',
    type: 'uuid',
  })
  programId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({
    type: 'enum',
    enum: TaskResponseStatus,
    default: TaskResponseStatus.PENDING,
  })
  status: TaskResponseStatus;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
