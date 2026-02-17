import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Task } from 'src/task/entities/task.entity';
import { User } from 'src/user/entities/user.entity';

@Entity({ name: 'volunteer_ratings' })
@Index(['taskId', 'ratedByUserId'], { unique: true })
export class VolunteerRating {
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
  })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({
    name: 'rated_by_user_id',
    type: 'uuid',
  })
  ratedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rated_by_user_id' })
  ratedByUser: User;

  @Column({
    type: 'int',
  })
  score: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  comment?: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}

