import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { ImageModule } from 'src/image/image.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Skill]),
    ImageModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule {}
