import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Task } from 'src/task/entities/task.entity';

export enum PointsTransactionType {
  TASK_COMPLETION = 'task_completion',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  REFUND = 'refund',
}

export enum PointsTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'points_transactions' })
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'volunteer_id',
    type: 'uuid',
  })
  volunteerId: string;

  @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @Column({
    name: 'task_id',
    type: 'uuid',
    nullable: true,
  })
  taskId?: string;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({
    type: 'int',
  })
  amount: number; // Может быть положительным (начисление) или отрицательным (списание)

  @Column({
    type: 'enum',
    enum: PointsTransactionType,
    default: PointsTransactionType.TASK_COMPLETION,
  })
  type: PointsTransactionType;

  @Column({
    type: 'enum',
    enum: PointsTransactionStatus,
    default: PointsTransactionStatus.COMPLETED,
  })
  status: PointsTransactionStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'balance_before',
    type: 'int',
  })
  balanceBefore: number; // Баланс до транзакции

  @Column({
    name: 'balance_after',
    type: 'int',
  })
  balanceAfter: number; // Баланс после транзакции

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
