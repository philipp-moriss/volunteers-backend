import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { Skill } from './entities/skill.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, Category])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService, TypeOrmModule],
})
export class SkillsModule {}
