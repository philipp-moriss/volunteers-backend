import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Program } from './entities/program.entity';
import { Admin } from 'src/user/entities/admin.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { User } from 'src/user/entities/user.entity';
import { UserRole, UserStatus } from 'src/shared/user/type';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(Volunteer)
    private volunteerRepository: Repository<Volunteer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createProgramDto: CreateProgramDto, userId: string): Promise<Program> {
    // Находим Admin entity по userId
    const admin = await this.adminRepository.findOne({
      where: { userId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with userId ${userId} not found`);
    }

    const program = this.programRepository.create({
      name: createProgramDto.name,
      description: createProgramDto.description,
      isActive: createProgramDto.isActive ?? true,
      ownerId: admin.id, // Используем ID админа, а не ID пользователя
    });

    return this.programRepository.save(program);
  }

  async findAll(): Promise<Program[]> {
    return this.programRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException(`Program with id ${id} not found`);
    }

    return program;
  }

  async update(id: string, updateProgramDto: UpdateProgramDto): Promise<Program> {
    const program = await this.findOne(id);

    await this.programRepository.update(id, updateProgramDto);

    return this.findOne(id);
  }

  async remove(id: string): Promise<Program> {
    const program = await this.findOne(id);
    await this.programRepository.delete(id);
    return program;
  }

  /**
   * Получить список волонтеров программы
   */
  async getVolunteers(programId: string) {
    // Проверяем существование программы
    await this.findOne(programId);

    // Получаем всех волонтеров с их программами и пользователями
    const volunteers = await this.volunteerRepository.find({
      relations: ['programs', 'user'],
    });

    // Фильтруем волонтеров, которые участвуют в этой программе
    const programVolunteers = volunteers.filter((volunteer) =>
      volunteer.programs?.some((p) => p.id === programId),
    );

    // Фильтруем по роли и статусу пользователя
    const approvedVolunteers = programVolunteers.filter(
      (volunteer) =>
        volunteer.user?.role === UserRole.VOLUNTEER &&
        volunteer.user?.status === UserStatus.APPROVED,
    );

    // Извлекаем пользователей из волонтеров
    const users = approvedVolunteers
      .map((volunteer) => volunteer.user)
      .filter((user): user is User => user !== null && user !== undefined)
      .map((user) => {
        // Преобразуем даты в ISO строки для консистентности с фронтендом
        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          about: user.about,
          createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString(),
        };
      });

    return users;
  }
}
