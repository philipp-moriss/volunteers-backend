import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { Skill } from 'src/skills/entities/skill.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      relations: ['skills', 'image'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['skills', 'image'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    Object.assign(category, updateCategoryDto);

    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['skills'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Удаляем только те скиллы категории, которые нигде не используются
    const removableSkills = await this.skillRepository
      .createQueryBuilder('skill')
      .leftJoin('skill.volunteers', 'volunteer')
      .leftJoin('task_skills', 'taskSkill', 'taskSkill.skill_id = skill.id')
      .where('skill.categoryId = :categoryId', { categoryId: id })
      .groupBy('skill.id')
      .having(
        'COUNT(DISTINCT volunteer.id) = 0 AND COUNT(DISTINCT taskSkill.task_id) = 0',
      )
      .getMany();

    if (removableSkills.length > 0) {
      await this.skillRepository.remove(removableSkills);
    }

    // Если после очистки остались скиллы, значит они используются волонтёрами или тасками
    const remainingSkillsCount = await this.skillRepository.count({
      where: { categoryId: id },
    });

    if (remainingSkillsCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ID ${id} because it has ${remainingSkillsCount} skills used by volunteers or tasks`,
      );
    }

    await this.categoryRepository.remove(category);
  }
}
