import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { AssignVolunteerDto } from './dto/assign-volunteer.dto';
import { TaskStatus } from './types/task-status.enum';
import { TaskApproveRole } from './types/task-approve-role.enum';
import { TaskResponseStatus } from './types/task-response-status.enum';
import { UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { UserRole } from 'src/shared/user/type';
import { User } from 'src/user/entities/user.entity';
import { Needy } from 'src/user/entities/needy.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Program } from 'src/program/entities/program.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { Category } from 'src/categories/entities/category.entity';
import { sanitizeUser } from 'src/shared/utils/user-sanitizer';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Needy)
    private readonly needyRepository: Repository<Needy>,
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    userMetadata: UserMetadata,
  ): Promise<Task> {
    // Проверяем права: только needy (создатель) или admin
    if (userMetadata.role !== UserRole.NEEDY && userMetadata.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only needy users or admins can create tasks');
    }

    // Проверяем существование программы
    const program = await this.programRepository.findOne({
      where: { id: createTaskDto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID ${createTaskDto.programId} not found`);
    }

    // Проверяем существование нуждающегося
    const needy = await this.needyRepository.findOne({
      where: { userId: createTaskDto.needyId },
      relations: ['user'],
      select: {
        user: {
          id: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          photo: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      },
    });
    if (!needy) {
      throw new NotFoundException(`Needy user with ID ${createTaskDto.needyId} not found`);
    }
    
    // Дополнительная защита: очищаем чувствительные данные
    if (needy.user) {
      needy.user = sanitizeUser(needy.user) as any;
    }

    // Если создает не админ, проверяем что это тот же пользователь
    if (userMetadata.role === UserRole.NEEDY && needy.userId !== userMetadata.userId) {
      throw new ForbiddenException('You can only create tasks for yourself');
    }

    // Проверяем категорию, если указана
    if (createTaskDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createTaskDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${createTaskDto.categoryId} not found`);
      }
    }

    // Загружаем навыки, если указаны
    let skills: Skill[] = [];
    if (createTaskDto.skillIds && createTaskDto.skillIds.length > 0) {
      skills = await this.skillRepository.find({
        where: { id: In(createTaskDto.skillIds) },
      });
      if (skills.length !== createTaskDto.skillIds.length) {
        throw new NotFoundException('Some skills not found');
      }
    }

    const task = this.taskRepository.create({
      programId: createTaskDto.programId,
      needyId: createTaskDto.needyId,
      type: createTaskDto.type,
      title: createTaskDto.title,
      description: createTaskDto.description,
      details: createTaskDto.details,
      points: createTaskDto.points ?? 10,
      categoryId: createTaskDto.categoryId,
      firstResponseMode: createTaskDto.firstResponseMode ?? false,
      status: TaskStatus.ACTIVE,
      skills,
    });

    return await this.taskRepository.save(task);
  }

  async findAll(programId?: string, filters?: {
    status?: TaskStatus;
    categoryId?: string;
    skillIds?: string[];
  }): Promise<Task[]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.program', 'program')
      .leftJoinAndSelect('task.needy', 'needy')
      .leftJoinAndSelect('task.assignedVolunteer', 'assignedVolunteer')
      .leftJoinAndSelect('task.category', 'category')
      .leftJoinAndSelect('task.skills', 'skills')
      // Исключаем чувствительные поля из User relations
      .addSelect([
        'needy.id',
        'needy.phone',
        'needy.email',
        'needy.role',
        'needy.status',
        'needy.firstName',
        'needy.lastName',
        'needy.photo',
        'needy.about',
        'needy.createdAt',
        'needy.updatedAt',
        'needy.lastLoginAt',
      ])
      .addSelect([
        'assignedVolunteer.id',
        'assignedVolunteer.phone',
        'assignedVolunteer.email',
        'assignedVolunteer.role',
        'assignedVolunteer.status',
        'assignedVolunteer.firstName',
        'assignedVolunteer.lastName',
        'assignedVolunteer.photo',
        'assignedVolunteer.about',
        'assignedVolunteer.createdAt',
        'assignedVolunteer.updatedAt',
        'assignedVolunteer.lastLoginAt',
      ]);

    if (programId) {
      queryBuilder.where('task.programId = :programId', { programId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.categoryId) {
      queryBuilder.andWhere('task.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters?.skillIds && filters.skillIds.length > 0) {
      queryBuilder
        .innerJoin('task.skills', 'filterSkill')
        .andWhere('filterSkill.id IN (:...skillIds)', { skillIds: filters.skillIds });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    const tasks = await queryBuilder.getMany();
    
    // Дополнительная защита: очищаем чувствительные данные
    return tasks.map(task => {
      if (task.needy) {
        task.needy = sanitizeUser(task.needy) as any;
      }
      if (task.assignedVolunteer) {
        task.assignedVolunteer = sanitizeUser(task.assignedVolunteer) as any;
      }
      return task;
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'program',
        'needy',
        'assignedVolunteer',
        'category',
        'skills',
      ],
      select: {
        needy: {
          id: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          photo: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
        assignedVolunteer: {
          id: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          photo: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Дополнительная защита: очищаем чувствительные данные
    if (task.needy) {
      task.needy = sanitizeUser(task.needy) as any;
    }
    if (task.assignedVolunteer) {
      task.assignedVolunteer = sanitizeUser(task.assignedVolunteer) as any;
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userMetadata: UserMetadata,
  ): Promise<Task> {
    const task = await this.findOne(id);

    // Проверяем права: только needy (создатель) или admin
    if (userMetadata.role !== UserRole.NEEDY && userMetadata.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only needy users or admins can update tasks');
    }

    // Если обновляет не админ, проверяем что это создатель таски
    if (userMetadata.role === UserRole.NEEDY && task.needyId !== userMetadata.userId) {
      throw new ForbiddenException('You can only update your own tasks');
    }

    // Обновляем категорию, если указана
    if (updateTaskDto.categoryId !== undefined) {
      if (updateTaskDto.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: updateTaskDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException(`Category with ID ${updateTaskDto.categoryId} not found`);
        }
      }
      task.categoryId = updateTaskDto.categoryId;
    }

    // Обновляем навыки, если указаны
    if (updateTaskDto.skillIds !== undefined) {
      if (updateTaskDto.skillIds && updateTaskDto.skillIds.length > 0) {
        const skills = await this.skillRepository.find({
          where: { id: In(updateTaskDto.skillIds) },
        });
        if (skills.length !== updateTaskDto.skillIds.length) {
          throw new NotFoundException('Some skills not found');
        }
        task.skills = skills;
      } else {
        task.skills = [];
      }
    }

    // Обновляем остальные поля
    Object.assign(task, {
      type: updateTaskDto.type,
      title: updateTaskDto.title,
      description: updateTaskDto.description,
      details: updateTaskDto.details,
      points: updateTaskDto.points,
      firstResponseMode: updateTaskDto.firstResponseMode,
    });

    return await this.taskRepository.save(task);
  }

  async remove(id: string, userMetadata: UserMetadata): Promise<void> {
    const task = await this.findOne(id);

    // Проверяем права: только needy (создатель) или admin
    if (userMetadata.role !== UserRole.NEEDY && userMetadata.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only needy users or admins can delete tasks');
    }

    // Если удаляет не админ, проверяем что это создатель таски
    if (userMetadata.role === UserRole.NEEDY && task.needyId !== userMetadata.userId) {
      throw new ForbiddenException('You can only delete your own tasks');
    }

    // Меняем статус на CANCELLED вместо удаления
    task.status = TaskStatus.CANCELLED;
    await this.taskRepository.save(task);
  }

  async assignVolunteer(
    id: string,
    assignVolunteerDto: AssignVolunteerDto,
    userMetadata: UserMetadata,
  ): Promise<Task> {
    // Проверяем права: только needy (создатель) или admin
    if (userMetadata.role !== UserRole.NEEDY && userMetadata.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only needy users or admins can assign volunteers');
    }

    const task = await this.findOne(id);

    // Если назначает не админ, проверяем что это создатель таски
    if (userMetadata.role === UserRole.NEEDY && task.needyId !== userMetadata.userId) {
      throw new ForbiddenException('You can only assign volunteers to your own tasks');
    }

    // Проверяем существование волонтера
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: assignVolunteerDto.volunteerId },
      relations: ['programs'],
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer not found');
    }

    // Проверяем, что волонтер в той же программе
    const isInProgram = volunteer.programs?.some((p) => p.id === task.programId);
    if (!isInProgram) {
      throw new ForbiddenException('Volunteer is not in the same program as this task');
    }

    // Назначаем волонтера
    task.assignedVolunteerId = assignVolunteerDto.volunteerId;
    task.status = TaskStatus.IN_PROGRESS;

    return await this.taskRepository.save(task);
  }

  async cancelAssignment(id: string, userMetadata: UserMetadata): Promise<Task> {
    const task = await this.findOne(id);

    // Проверяем права: только needy (создатель) или назначенный волонтер
    if (userMetadata.role === UserRole.NEEDY) {
      if (task.needyId !== userMetadata.userId) {
        throw new ForbiddenException('You can only cancel assignment for your own tasks');
      }
    } else if (userMetadata.role === UserRole.VOLUNTEER) {
      if (task.assignedVolunteerId !== userMetadata.userId) {
        throw new ForbiddenException('You can only cancel your own assignment');
      }
    } else {
      throw new ForbiddenException('Only needy users or assigned volunteers can cancel assignment');
    }

    if (!task.assignedVolunteerId) {
      throw new BadRequestException('Task has no assigned volunteer');
    }

    // Снимаем назначение
    task.assignedVolunteerId = undefined;
    task.status = TaskStatus.ACTIVE;

    return await this.taskRepository.save(task);
  }

  async approveCompletion(
    id: string,
    approveTaskDto: ApproveTaskDto,
    userMetadata: UserMetadata,
  ): Promise<Task> {
    const task = await this.findOne(id);

    // Проверяем права: только volunteer или needy
    if (userMetadata.role !== UserRole.VOLUNTEER && userMetadata.role !== UserRole.NEEDY) {
      throw new ForbiddenException('Only volunteers or needy users can approve completion');
    }

    // Проверяем, что пользователь имеет отношение к таске
    if (userMetadata.role === UserRole.VOLUNTEER) {
      if (task.assignedVolunteerId !== userMetadata.userId) {
        throw new ForbiddenException('You can only approve completion for your assigned tasks');
      }
    } else if (userMetadata.role === UserRole.NEEDY) {
      if (task.needyId !== userMetadata.userId) {
        throw new ForbiddenException('You can only approve completion for your own tasks');
      }
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Task is not in progress');
    }

    // Добавляем роль в массив approveBy, если её там еще нет
    if (!task.approveBy.includes(approveTaskDto.role)) {
      task.approveBy = [...task.approveBy, approveTaskDto.role];
    }

    // Проверяем, подтвердили ли оба
    const hasVolunteer = task.approveBy.includes(TaskApproveRole.VOLUNTEER);
    const hasNeedy = task.approveBy.includes(TaskApproveRole.NEEDY);

    if (hasVolunteer && hasNeedy) {
      // Оба подтвердили - завершаем таску
      task.status = TaskStatus.COMPLETED;

      // Начисляем баллы волонтеру
      if (task.assignedVolunteerId) {
        const volunteer = await this.volunteerRepository.findOne({
          where: { userId: task.assignedVolunteerId },
        });

        if (volunteer) {
          volunteer.points += task.points;
          volunteer.completedTasksCount += 1;
          await this.volunteerRepository.save(volunteer);
        }
      }
    }

    return await this.taskRepository.save(task);
  }

  async getMyTasks(userMetadata: UserMetadata): Promise<Task[]> {
    if (userMetadata.role !== UserRole.NEEDY) {
      throw new ForbiddenException('Only needy users can view their own tasks');
    }

    const needy = await this.needyRepository.findOne({
      where: { userId: userMetadata.userId },
    });

    if (!needy) {
      throw new NotFoundException('Needy profile not found');
    }

    const tasks = await this.taskRepository.find({
      where: { needyId: userMetadata.userId },
      relations: [
        'program',
        'assignedVolunteer',
        'category',
        'skills',
      ],
      select: {
        assignedVolunteer: {
          id: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          photo: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    // Дополнительная защита: очищаем чувствительные данные
    return tasks.map(task => {
      if (task.assignedVolunteer) {
        task.assignedVolunteer = sanitizeUser(task.assignedVolunteer) as any;
      }
      return task;
    });
  }

  async getAssignedTasks(userMetadata: UserMetadata): Promise<Task[]> {
    if (userMetadata.role !== UserRole.VOLUNTEER) {
      throw new ForbiddenException('Only volunteers can view assigned tasks');
    }

    const tasks = await this.taskRepository.find({
      where: { assignedVolunteerId: userMetadata.userId },
      relations: [
        'program',
        'needy',
        'category',
        'skills',
      ],
      select: {
        needy: {
          id: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          photo: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    // Дополнительная защита: очищаем чувствительные данные
    return tasks.map(task => {
      if (task.needy) {
        task.needy = sanitizeUser(task.needy) as any;
      }
      return task;
    });
  }
}
