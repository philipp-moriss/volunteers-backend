import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskResponse } from './entities/task-response.entity';
import { Task } from './entities/task.entity';
import { ApproveVolunteerDto } from './dto/approve-volunteer.dto';
import { TaskResponseStatus } from './types/task-response-status.enum';
import { TaskStatus } from './types/task-status.enum';
import { UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { UserRole } from 'src/shared/user/type';
import { Volunteer } from 'src/user/entities/volunteer.entity';

@Injectable()
export class TaskResponseService {
  constructor(
    @InjectRepository(TaskResponse)
    private readonly taskResponseRepository: Repository<TaskResponse>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
  ) {}

  async respond(id: string, userMetadata: UserMetadata): Promise<TaskResponse> {
    if (userMetadata.role !== UserRole.VOLUNTEER) {
      throw new ForbiddenException('Only volunteers can respond to tasks');
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['program', 'needy'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (task.status !== TaskStatus.ACTIVE) {
      throw new BadRequestException('Task is not active');
    }

    // Проверяем, не откликался ли уже этот волонтер
    const existingResponse = await this.taskResponseRepository.findOne({
      where: {
        taskId: id,
        volunteerId: userMetadata.userId,
      },
    });

    if (existingResponse) {
      throw new BadRequestException('You have already responded to this task');
    }

    // Проверяем, не назначен ли уже волонтер
    if (task.assignedVolunteerId) {
      throw new BadRequestException('Task already has an assigned volunteer');
    }

    // Получаем профиль волонтера для проверки программы
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: userMetadata.userId },
      relations: ['programs'],
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    // Проверяем, что волонтер в той же программе
    const isInProgram = volunteer.programs?.some((p) => p.id === task.programId);
    if (!isInProgram) {
      throw new ForbiddenException('You are not in the same program as this task');
    }

    const taskResponse = this.taskResponseRepository.create({
      taskId: id as any,
      volunteerId: userMetadata.userId as any,
      programId: task.programId as any,
      status: TaskResponseStatus.PENDING,
    });

    const savedResponse = await this.taskResponseRepository.save(taskResponse);

    // Если включен режим первого отклика, автоматически назначаем волонтера
    if (task.firstResponseMode) {
      task.assignedVolunteerId = userMetadata.userId as any;
      task.status = TaskStatus.IN_PROGRESS;
      savedResponse.status = TaskResponseStatus.APPROVED;
      await this.taskRepository.save(task);
      await this.taskResponseRepository.save(savedResponse);

      // Отклоняем остальные отклики (если они есть)
      await this.taskResponseRepository
        .createQueryBuilder()
        .update(TaskResponse)
        .set({ status: TaskResponseStatus.REJECTED })
        .where('taskId = :taskId', { taskId: id })
        .andWhere('volunteerId != :volunteerId', { volunteerId: userMetadata.userId })
        .andWhere('status = :status', { status: TaskResponseStatus.PENDING })
        .execute();
    }

    return savedResponse;
  }

  async cancelResponse(id: string, userMetadata: UserMetadata): Promise<void> {
    if (userMetadata.role !== UserRole.VOLUNTEER) {
      throw new ForbiddenException('Only volunteers can cancel responses');
    }

    const task = await this.taskRepository.findOne({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel response for task in progress or completed');
    }

    const taskResponse = await this.taskResponseRepository.findOne({
      where: {
        taskId: id,
        volunteerId: userMetadata.userId,
      },
    });

    if (!taskResponse) {
      throw new NotFoundException('Response not found');
    }

    if (taskResponse.status === TaskResponseStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel approved response');
    }

    await this.taskResponseRepository.remove(taskResponse);
  }

  async approveVolunteer(
    id: string,
    approveVolunteerDto: ApproveVolunteerDto,
    userMetadata: UserMetadata,
  ): Promise<{ taskResponse: TaskResponse; task: Task }> {
    if (userMetadata.role !== UserRole.NEEDY) {
      throw new ForbiddenException('Only needy users can approve volunteers');
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['needy'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (task.needyId !== userMetadata.userId) {
      throw new ForbiddenException('You can only approve volunteers for your own tasks');
    }

    if (task.status !== TaskStatus.ACTIVE) {
      throw new BadRequestException('Task is not active');
    }

    // Проверяем существование отклика
    const taskResponse = await this.taskResponseRepository.findOne({
      where: {
        taskId: id,
        volunteerId: approveVolunteerDto.volunteerId,
      },
      relations: ['volunteer'],
    });

    if (!taskResponse) {
      throw new NotFoundException('Response not found');
    }

    // Обновляем статус отклика
    taskResponse.status = TaskResponseStatus.APPROVED;
    await this.taskResponseRepository.save(taskResponse);

    // Назначаем волонтера и обновляем статус таски
    task.assignedVolunteerId = approveVolunteerDto.volunteerId;
    task.status = TaskStatus.IN_PROGRESS;
    await this.taskRepository.save(task);

    // Отклоняем остальные отклики
    await this.taskResponseRepository
      .createQueryBuilder()
      .update(TaskResponse)
      .set({ status: TaskResponseStatus.REJECTED })
      .where('taskId = :taskId', { taskId: id })
      .andWhere('volunteerId != :volunteerId', { volunteerId: approveVolunteerDto.volunteerId })
      .andWhere('status = :status', { status: TaskResponseStatus.PENDING })
      .execute();

    return { taskResponse, task };
  }

  async rejectVolunteer(
    id: string,
    approveVolunteerDto: ApproveVolunteerDto,
    userMetadata: UserMetadata,
  ): Promise<void> {
    if (userMetadata.role !== UserRole.NEEDY) {
      throw new ForbiddenException('Only needy users can reject volunteers');
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['needy'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (task.needyId !== userMetadata.userId) {
      throw new ForbiddenException('You can only reject volunteers for your own tasks');
    }

    const taskResponse = await this.taskResponseRepository.findOne({
      where: {
        taskId: id,
        volunteerId: approveVolunteerDto.volunteerId,
      },
    });

    if (!taskResponse) {
      throw new NotFoundException('Response not found');
    }

    taskResponse.status = TaskResponseStatus.REJECTED;
    await this.taskResponseRepository.save(taskResponse);
  }

  async getByTaskId(taskId: string, userMetadata?: UserMetadata): Promise<TaskResponse[]> {
    // Проверяем существование таски
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['needy'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Если передан userMetadata, проверяем права доступа
    if (userMetadata) {
      // Только needy (создатель таски) может видеть отклики
      if (userMetadata.role !== UserRole.NEEDY) {
        throw new ForbiddenException('Only task owner can view responses');
      }

      if (task.needyId !== userMetadata.userId) {
        throw new ForbiddenException('You can only view responses for your own tasks');
      }
    }

    return await this.taskResponseRepository.find({
      where: { taskId },
      relations: ['volunteer', 'program'],
      order: { createdAt: 'DESC' },
    });
  }

  async getByVolunteerId(volunteerId: string): Promise<TaskResponse[]> {
    return await this.taskResponseRepository.find({
      where: { volunteerId },
      relations: ['task', 'task.needy', 'program'],
      order: { createdAt: 'DESC' },
    });
  }
}
