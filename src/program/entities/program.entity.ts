import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { Admin } from 'src/user/entities/admin.entity';
import { Needy } from 'src/user/entities/needy.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';

@Entity({ name: 'programs' })
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'owner_id',
    type: 'uuid',
  })
  ownerId: string;

  @ManyToOne(() => Admin, (admin) => admin.ownedPrograms, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: Admin;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => Needy, (needy) => needy.program)
  needies?: Needy[];

  @ManyToMany(() => Volunteer, (volunteer) => volunteer.programs)
  volunteers?: Volunteer[];
}
