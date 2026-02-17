import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Program } from 'src/program/entities/program.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { City } from 'src/city/entities/city.entity';

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

  @ManyToMany(() => Program, (program) => program.volunteers)
  @JoinTable({
    name: 'volunteer_programs',
    joinColumn: {
      name: 'volunteer_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'program_id',
      referencedColumnName: 'id',
    },
  })
  programs: Program[];

  @ManyToMany(() => Skill, (skill) => skill.volunteers)
  skills: Skill[];

  @Column({
    name: 'city_id',
    type: 'uuid',
    nullable: true,
  })
  cityId?: string;

  @ManyToOne(() => City, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'city_id' })
  city?: City;

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

  @Column({
    name: 'rating_count',
    type: 'int',
    default: 0,
  })
  ratingCount: number;

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
