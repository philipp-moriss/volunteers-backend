import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Program } from 'src/program/entities/program.entity';
import { Skill } from 'src/skills/entities/skill.entity';

@Entity({ name: 'volunteers' })
export class Volunteer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    unique: true,
  })
  userId: string;

  @Column({
    name: 'program_id',
    type: 'uuid',
  })
  programId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({
    name: 'city_id',
    type: 'uuid',
  })
  cityId: string;

  // TODO: Раскомментировать когда модуль City будет создан
  // @ManyToOne(() => City, { onDelete: 'RESTRICT' })
  // @JoinColumn({ name: 'city_id' })
  // city: City;

  @ManyToMany(() => Skill, (skill) => skill.volunteers)
  skills: Skill[];

  @Column({
    type: 'int',
    default: 0,
  })
  points: number;

  @Column({
    name: 'completed_tasks_count',
    type: 'int',
    default: 0,
  })
  completedTasksCount: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  rating?: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
