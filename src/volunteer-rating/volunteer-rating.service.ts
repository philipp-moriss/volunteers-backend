import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VolunteerRating } from './entities/volunteer-rating.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Task } from 'src/task/entities/task.entity';
import { CreateVolunteerRatingDto } from './dto/create-volunteer-rating.dto';
import { UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { UserRole } from 'src/shared/user/type';
import { TaskStatus } from 'src/task/types/task-status.enum';
import { GetVolunteerRatingDto } from './dto/get-volunteer-rating.dto';
import { GetVolunteerRatingsAdminDto } from './dto/get-volunteer-ratings-admin.dto';
import {
  GetVolunteerRatingsAdminResponseDto,
  VolunteerRatingAdminItemDto,
} from './dto/get-volunteer-ratings-admin-response.dto';

@Injectable()
export class VolunteerRatingService {
  constructor(
    @InjectRepository(VolunteerRating)
    private readonly volunteerRatingRepository: Repository<VolunteerRating>,
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly dataSource: DataSource,
  ) {}

  async createRating(
    volunteerUserId: string,
    createVolunteerRatingDto: CreateVolunteerRatingDto,
    user: UserMetadata,
  ) {
    if (user.userId === volunteerUserId) {
      throw new ForbiddenException('You cannot rate yourself');
    }

    if (user.role !== UserRole.NEEDY && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only needy users or admins can rate volunteers');
    }

    const task = await this.taskRepository.findOne({
      where: { id: createVolunteerRatingDto.taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${createVolunteerRatingDto.taskId} not found`);
    }

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Task must be completed before rating');
    }

    if (task.assignedVolunteerId !== volunteerUserId) {
      throw new ForbiddenException('This volunteer is not assigned to the specified task');
    }

    if (user.role === UserRole.NEEDY && task.needyId !== user.userId) {
      throw new ForbiddenException('You can only rate volunteers for your own tasks');
    }

    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: volunteerUserId },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    const existingRating = await this.volunteerRatingRepository.findOne({
      where: {
        taskId: createVolunteerRatingDto.taskId,
        ratedByUserId: user.userId,
      },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this volunteer for this task');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const volunteerRatingRepo = manager.getRepository(VolunteerRating);
      const volunteerRepo = manager.getRepository(Volunteer);

      const rating = volunteerRatingRepo.create({
        volunteerId: volunteer.id,
        taskId: task.id,
        ratedByUserId: user.userId,
        score: createVolunteerRatingDto.score,
        comment: createVolunteerRatingDto.comment,
      });

      const savedRating = await volunteerRatingRepo.save(rating);

      const volunteerForUpdate = await volunteerRepo.findOne({
        where: { id: volunteer.id },
      });

      if (!volunteerForUpdate) {
        throw new NotFoundException('Volunteer profile not found');
      }

      const currentCount = volunteerForUpdate.ratingCount ?? 0;
      const currentRating =
        volunteerForUpdate.rating !== null && volunteerForUpdate.rating !== undefined
          ? Number(volunteerForUpdate.rating)
          : 0;

      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + createVolunteerRatingDto.score) / newCount;
      const clampedRating = Math.min(newRating, 5);

      volunteerForUpdate.rating = Number(clampedRating.toFixed(2)) as unknown as number;
      volunteerForUpdate.ratingCount = newCount;

      const updatedVolunteer = await volunteerRepo.save(volunteerForUpdate);

      return {
        id: savedRating.id,
        taskId: savedRating.taskId,
        volunteerUserId,
        score: savedRating.score,
        comment: savedRating.comment,
        createdAt: savedRating.createdAt,
        volunteerRating: {
          rating: updatedVolunteer.rating,
          ratingCount: updatedVolunteer.ratingCount,
        },
      };
    });

    return result;
  }

  async getRatings(volunteerUserId: string): Promise<GetVolunteerRatingDto[]> {
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: volunteerUserId },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    const ratings = await this.volunteerRatingRepository.find({
      where: { volunteerId: volunteer.id },
      order: { createdAt: 'DESC' },
    });

    return ratings.map((rating) => ({
      id: rating.id,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt,
    }));
  }

  async getRatingsForAdmin(
    params: GetVolunteerRatingsAdminDto,
  ): Promise<GetVolunteerRatingsAdminResponseDto> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.volunteerRatingRepository
      .createQueryBuilder('rating')
      .leftJoin('rating.volunteer', 'volunteer')
      .leftJoin('volunteer.user', 'user')
      .leftJoin('rating.task', 'task')
      .select([
        'rating.id',
        'rating.score',
        'rating.comment',
        'rating.createdAt',
        'task.id',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.phone',
        'user.email',
      ])
      .orderBy('rating.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (params.search && params.search.trim()) {
      const raw = params.search.trim();
      const like = `%${raw}%`;

      queryBuilder.andWhere(
        '(user.firstName ILIKE :like OR user.lastName ILIKE :like OR user.email ILIKE :like OR user.phone ILIKE :like OR user.id::text = :exact)',
        {
          like,
          exact: raw,
        },
      );
    }

    const [rows, total] = await queryBuilder.getManyAndCount();

    const items: VolunteerRatingAdminItemDto[] = rows.map((rating) => ({
      id: rating.id,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt,
      volunteerUserId: rating.volunteer?.userId ?? rating.volunteer?.user?.id ?? '',
      volunteerFirstName: rating.volunteer?.user?.firstName,
      volunteerLastName: rating.volunteer?.user?.lastName,
      volunteerPhone: rating.volunteer?.user?.phone,
      volunteerEmail: rating.volunteer?.user?.email,
      taskId: rating.task?.id ?? rating.taskId,
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }
}

