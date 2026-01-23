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

    // Используем query builder с relation-based join для правильной фильтрации по программе
    const volunteers = await this.volunteerRepository
      .createQueryBuilder('volunteer')
      .innerJoin('volunteer.programs', 'program', 'program.id = :programId', {
        programId,
      })
      .innerJoinAndSelect('volunteer.user', 'user')
      .where('user.role = :role', { role: UserRole.VOLUNTEER })
      .andWhere('user.status = :status', { status: UserStatus.APPROVED })
      .getMany();

    // Извлекаем пользователей из волонтеров
    const users = volunteers
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

  /**
   * Назначить волонтера на программу
   */
  async assignVolunteerToProgram(programId: string, volunteerId: string) {
    // Проверяем существование программы
    await this.findOne(programId);

    // Находим волонтера по userId (volunteerId - это userId пользователя)
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: volunteerId },
      relations: ['programs'],
    });

    if (!volunteer) {
      throw new NotFoundException(`Volunteer with userId ${volunteerId} not found`);
    }

    // Проверяем, не назначен ли уже волонтер на эту программу (idempotent)
    const isAlreadyAssigned = volunteer.programs?.some((p) => p.id === programId);
    if (isAlreadyAssigned) {
      return { success: true, message: 'Volunteer already assigned to program' };
    }

    // Программа уже проверена в findOne выше, просто получаем её для добавления
    const program = await this.programRepository.findOne({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException(`Program with id ${programId} not found`);
    }

    // Добавляем программу в массив программ волонтера
    volunteer.programs = [...(volunteer.programs || []), program];
    await this.volunteerRepository.save(volunteer);

    return { success: true, message: 'Volunteer assigned to program successfully' };
  }
}
