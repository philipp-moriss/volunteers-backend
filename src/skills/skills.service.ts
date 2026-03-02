import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { Category } from 'src/categories/entities/category.entity';
import { UserRole } from 'src/shared/user';
import { UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { In, Repository } from 'typeorm';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { BulkUpdateSkillsDto } from './dto/bulk-update-skills.dto';
import { Skill } from './entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createSkillDto: CreateSkillDto,
    user: UserMetadata,
  ): Promise<Skill> {
    const category = await this.categoryRepository.findOne({
      where: { id: createSkillDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createSkillDto.categoryId} not found`,
      );
    }

    const skill = this.skillRepository.create({
      ...createSkillDto,
      category,
      createdByRole: user.role,
      createdByUserId: user.userId,
    });

    return await this.skillRepository.save(skill);
  }

  async findAll(categoryId?: UUID): Promise<Skill[]> {
    const where = categoryId ? { categoryId } : {};

    return await this.skillRepository.find({
      where,
      relations: ['category'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: ['category', 'volunteers'],
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    return skill;
  }

  async update(id: string, updateSkillDto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.findOne(id);

    if (updateSkillDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateSkillDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSkillDto.categoryId} not found`,
        );
      }

      skill.category = category;
    }

    Object.assign(skill, {
      name: updateSkillDto.name ?? skill.name,
      iconSvg: updateSkillDto.iconSvg ?? skill.iconSvg,
    });

    return await this.skillRepository.save(skill);
  }

  async bulkUpdate(bulkUpdateSkillsDto: BulkUpdateSkillsDto): Promise<Skill[]> {
    const ids = bulkUpdateSkillsDto.items.map((item) => item.id);

    const skills = await this.skillRepository.findBy({ id: In(ids) });

    if (skills.length !== ids.length) {
      throw new NotFoundException('One or more skills not found');
    }

    const skillsById = new Map<string, Skill>();

    skills.forEach((skill) => {
      skillsById.set(skill.id, skill);
    });

    bulkUpdateSkillsDto.items.forEach((item) => {
      const skill = skillsById.get(item.id);

      if (!skill) {
        return;
      }

      skill.name = item.name;
      skill.iconSvg = item.iconSvg;
    });

    return await this.skillRepository.save(Array.from(skillsById.values()));
  }

  async remove(id: string, user: UserMetadata): Promise<void> {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: ['volunteers'],
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isAdminCreated =
      !skill.createdByRole || skill.createdByRole === UserRole.ADMIN;

    if (!isAdmin && isAdminCreated) {
      throw new ForbiddenException(
        `Only admin can delete system skills with ID ${id}`,
      );
    }

    if (isAdminCreated && skill.volunteers && skill.volunteers.length > 0) {
      throw new ConflictException(
        `Cannot delete skill with ID ${id} because it is associated with volunteers`,
      );
    }

    await this.skillRepository.remove(skill);
  }
}
