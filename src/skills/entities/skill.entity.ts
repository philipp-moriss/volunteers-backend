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
import { Category } from 'src/categories/entities/category.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { UserRole } from 'src/shared/user';

@Entity({ name: 'skills' })
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    name: 'icon_svg',
    type: 'text',
  })
  iconSvg: string;

  @Column({
    name: 'category_id',
    type: 'uuid',
  })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.skills, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToMany(() => Volunteer, (volunteer) => volunteer.skills)
  @JoinTable({
    name: 'volunteer_skills',
    joinColumn: {
      name: 'skill_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'volunteer_id',
      referencedColumnName: 'id',
    },
  })
  volunteers?: Volunteer[];

  @Column({
    name: 'created_by_role',
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  createdByRole?: UserRole | null;

  @Column({
    name: 'created_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  createdByUserId?: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
