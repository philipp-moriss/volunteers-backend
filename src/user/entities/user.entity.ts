import { UserRole, UserStatus } from 'src/shared/user';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
    nullable: true,
  })
  phone?: string;

  @Column({
    unique: true,
    nullable: true,
  })
  email?: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    nullable: true,
  })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  firstName?: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastName?: string;

  @Column({
    name: 'photo',
    type: 'varchar',
    nullable: true,
  })
  photo?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  about?: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    nullable: true,
  })
  refreshTokenHash?: string;

  @Column({
    name: 'last_login_at',
    type: 'timestamp',
    nullable: true,
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'he',
  })
  language?: string;

  @Column({
    name: 'onboarding_completed',
    type: 'boolean',
    default: false,
  })
  onboardingCompleted: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @Column({
    name: 'approved_by_id',
    type: 'uuid',
    nullable: true,
  })
  approvedById?: string | null;

  @Column({
    name: 'approved_at',
    type: 'timestamp',
    nullable: true,
  })
  approvedAt?: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User | null;
}
