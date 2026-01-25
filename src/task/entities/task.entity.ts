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
import { Program } from 'src/program/entities/program.entity';
import { User } from 'src/user/entities/user.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { Category } from 'src/categories/entities/category.entity';
import { City } from 'src/city/entities/city.entity';
import { TaskStatus } from '../types/task-status.enum';
import { TaskApproveRole } from '../types/task-approve-role.enum';
import { Point } from 'geojson';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'program_id',
    type: 'uuid',
  })
  programId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({
    name: 'needy_id',
    type: 'uuid',
  })
  needyId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'needy_id' })
  needy: User;

  @Column({
    type: 'varchar',
    length: 255,
  })
  type: string;

  @Column({
    type: 'varchar',
    length: 500,
  })
  title: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  details?: string;

  @Column({
    type: 'int',
    default: 10,
  })
  points: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.ACTIVE,
  })
  status: TaskStatus;

  @Column({
    name: 'category_id',
    type: 'uuid',
    nullable: true,
  })
  categoryId?: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @ManyToMany(() => Skill)
  @JoinTable({
    name: 'task_skills',
    joinColumn: {
      name: 'task_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'skill_id',
      referencedColumnName: 'id',
    },
  })
  skills?: Skill[];

  @Column({
    name: 'first_response_mode',
    type: 'boolean',
    default: false,
  })
  firstResponseMode: boolean;

  @Column({
    name: 'assigned_volunteer_id',
    type: 'uuid',
    nullable: true,
  })
  assignedVolunteerId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_volunteer_id' })
  assignedVolunteer?: User;

  @Column({
    name: 'approve_by',
    type: 'simple-array',
    default: [],
  })
  approveBy: TaskApproveRole[];

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
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  address?: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location?: Point; // PostGIS Point для геолокации

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
