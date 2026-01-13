import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Program } from 'src/program/entities/program.entity';

@Entity({ name: 'needies' })
export class Needy {
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
    name: 'creator_id',
    type: 'uuid',
  })
  creatorId: string;

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

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;
}
