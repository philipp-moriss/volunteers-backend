import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Skill } from 'src/skills/entities/skill.entity';
import { Image } from 'src/image/entities/image.entity';

@Entity({ name: 'categories' })
export class Category {
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
    nullable: true,
  })
  iconSvg?: string; // Оставляем для обратной совместимости

  @Column({
    name: 'image_id',
    type: 'uuid',
    nullable: true,
  })
  imageId?: string | null;

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'image_id' })
  image?: Image;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => Skill, (skill) => skill.category)
  skills?: Skill[];
}
