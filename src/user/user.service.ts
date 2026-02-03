import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStatus, UserRole } from 'src/shared/user';
import { DataSource, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Needy } from './entities/needy.entity';
import { Volunteer } from './entities/volunteer.entity';
import { Admin } from './entities/admin.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { Program } from 'src/program/entities/program.entity';
import { DEFAULT_PROGRAM_ID } from 'src/shared/constants';
import {
  UserWithRoleData,
  UserWithVolunteerData,
  UserWithNeedyData,
  UserWithAdminData,
} from './types/user';
import { UUID } from 'crypto';
import { sanitizeUser } from 'src/shared/utils/user-sanitizer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Needy)
    private needyRepository: Repository<Needy>,
    @InjectRepository(Volunteer)
    private volunteerRepository: Repository<Volunteer>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    private dataSource: DataSource,
  ) {}

  async create(createUserDto: Partial<CreateUserDto>, creatorId?: string): Promise<UserWithRoleData> {
    const { passwordHash, skills, ...rest } = createUserDto;
    
    // Проверяем уникальность email, если указан
    if (rest.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: rest.email },
      });
      if (existingUser) {
        throw new BadRequestException(`User with email ${rest.email} already exists`);
      }
    }

    // Проверяем уникальность phone, если указан
    if (rest.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: rest.phone },
      });
      if (existingUser) {
        throw new BadRequestException(`User with phone ${rest.phone} already exists`);
      }
    }

    // Используем транзакцию для атомарности создания пользователя и профиля
    return await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const needyRepository = manager.getRepository(Needy);
      const volunteerRepository = manager.getRepository(Volunteer);
      const adminRepository = manager.getRepository(Admin);
      const skillRepository = manager.getRepository(Skill);
      const programRepository = manager.getRepository(Program);

      const user = userRepository.create({
        ...rest,
        passwordHash: createUserDto.passwordHash,
        status: rest.status || UserStatus.PENDING,
      } as User);

      const savedUser = await userRepository.save(user);
      
      // Создаем профиль пользователя в зависимости от роли
      const profile = await this.createUserProfile(
        savedUser.role,
        savedUser.id,
        {
          skills,
          programId: createUserDto.programId,
          creatorId,
          cityId: createUserDto.cityId,
          address: createUserDto.address,
        },
        {
          needyRepository,
          volunteerRepository,
          adminRepository,
          skillRepository,
          programRepository,
        },
      );

      const { passwordHash: _, refreshTokenHash: __, ...userWithoutPassword } = savedUser;
      
      let profileData;
      switch (savedUser.role) {
        case UserRole.VOLUNTEER: {
          const volunteerWithRelations = await volunteerRepository.findOne({
            where: { userId: savedUser.id },
            relations: ['programs', 'skills'],
          });
          if (!volunteerWithRelations) {
            throw new NotFoundException(`Volunteer data for user ${savedUser.id} not found`);
          }
          const { user: _, programs, ...volunteerData } = volunteerWithRelations;
          profileData = {
            ...volunteerData,
            programs,
          };
          break;
        }
        case UserRole.NEEDY: {
          const needyWithRelations = await needyRepository.findOne({
            where: { userId: savedUser.id },
            relations: ['program', 'creator'],
            select: {
              creator: {
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
          if (!needyWithRelations) {
            throw new NotFoundException(`Needy data for user ${savedUser.id} not found`);
          }
          const { user: _, program, creator, ...needyData } = needyWithRelations;
          profileData = {
            ...needyData,
            program,
            creator: creator ? sanitizeUser(creator) : undefined,
          };
          break;
        }
        case UserRole.ADMIN: {
          const adminWithRelations = await adminRepository.findOne({
            where: { userId: savedUser.id },
            relations: ['ownedPrograms', 'createdByAdmin'],
            select: {
              createdByAdmin: {
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
          if (!adminWithRelations) {
            throw new NotFoundException(`Admin data for user ${savedUser.id} not found`);
          }
          const { user: _, ownedPrograms, createdByAdmin, ...adminData } = adminWithRelations;
          profileData = {
            ...adminData,
            ownedPrograms,
            createdByAdmin: createdByAdmin ? sanitizeUser(createdByAdmin) : undefined,
          };
          break;
        }
        default:
          throw new BadRequestException(`Unknown user role: ${savedUser.role}`);
      }
      
      return {
        ...userWithoutPassword,
        role: savedUser.role,
        profile: profileData,
      } as UserWithRoleData;
    });
  }

  /**
   * Создает профиль пользователя в зависимости от роли
   * @param role - Роль пользователя
   * @param userId - ID пользователя
   * @param profileData - Данные для создания профиля
   * @param repositories - Репозитории для работы с БД в транзакции
   * @returns Созданный профиль пользователя (Admin, Needy или Volunteer)
   */
  private async createUserProfile(
    role: UserRole,
    userId: string,
    profileData: {
      skills?: string[];
      programId?: UUID;
      programIds?: string[];
      creatorId?: string;
      cityId?: UUID;
      address?: string;
    },
    repositories: {
      needyRepository: Repository<Needy>;
      volunteerRepository: Repository<Volunteer>;
      adminRepository: Repository<Admin>;
      skillRepository: Repository<Skill>;
      programRepository: Repository<Program>;
    },
  ): Promise<Admin | Needy | Volunteer> {
    const { skills, programId, programIds, creatorId, cityId, address } = profileData;
    const { needyRepository, volunteerRepository, adminRepository, skillRepository, programRepository } = repositories;

    switch (role) {
      case UserRole.NEEDY:
        if (!creatorId) {
          throw new BadRequestException('creatorId is required for needy users');
        }
        if (!programId) {
          throw new BadRequestException('programId is required for needy users');
        }
        
        const needy = needyRepository.create({
          userId,
          programId,
          creatorId,
          cityId,
          address,
        });
        return await needyRepository.save(needy);

      case UserRole.VOLUNTEER:
        // Если skills указаны как массив строк (IDs), находим соответствующие Skill entities
        let skillEntities: Skill[] = [];
        if (skills && skills.length > 0) {
          // Предполагаем, что skills - это массив UUID skill IDs
          skillEntities = await skillRepository.find({
            where: skills.map(id => ({ id })),
          });
          
          // Проверяем, что все skills найдены
          if (skillEntities.length !== skills.length) {
            const foundIds = skillEntities.map(s => s.id);
            const notFoundIds = skills.filter(id => !foundIds.includes(id));
            throw new BadRequestException(
              `Skills with IDs ${notFoundIds.join(', ')} not found`
            );
          }
        }
        
        // Автоматически назначаем волонтера на все существующие программы
        const allPrograms = await programRepository.find();
        
        // Если программ нет, назначаем дефолтную программу
        let programsToAssign = allPrograms;
        if (allPrograms.length === 0) {
          const defaultProgram = await programRepository.findOne({
            where: { id: DEFAULT_PROGRAM_ID },
          });
          if (defaultProgram) {
            programsToAssign = [defaultProgram];
          } else {
            // Если дефолтной программы нет, создаем волонтера без программ (будет ошибка при создании задачи)
            // Но лучше выбросить ошибку здесь
            throw new BadRequestException(
              `No programs found and default program ${DEFAULT_PROGRAM_ID} not found. Please contact administrator.`,
            );
          }
        } else {
          // Убеждаемся, что дефолтная программа включена
          const hasDefaultProgram = allPrograms.some(p => p.id === DEFAULT_PROGRAM_ID);
          if (!hasDefaultProgram) {
            const defaultProgram = await programRepository.findOne({
              where: { id: DEFAULT_PROGRAM_ID },
            });
            if (defaultProgram) {
              programsToAssign = [...allPrograms, defaultProgram];
            }
          }
        }
        
        const volunteer = volunteerRepository.create({
          userId,
          programs: programsToAssign,
          skills: skillEntities,
          cityId,
        });
        return await volunteerRepository.save(volunteer);

      case UserRole.ADMIN:
        const admin = adminRepository.create({
          userId,
        });
        return await adminRepository.save(admin);

      default:
        throw new BadRequestException(`Unknown user role: ${role}`);
    }
  }


  async findAll() {
    return this.userRepository.find({
      select: [
        'id',
        'phone',
        'email',
        'role',
        'status',
        'firstName',
        'lastName',
        'photo',
        'about',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
        'onboardingCompleted',
      ],
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'phone',
        'email',
        'role',
        'status',
        'firstName',
        'lastName',
        'photo',
        'about',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
        'onboardingCompleted',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findUserByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'phone',
        'email',
        'passwordHash',
        'role',
        'status',
        'firstName',
        'lastName',
        'photo',
        'about',
        'refreshTokenHash',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ],
    });
  }

  async update(id: string, updateUserDto: Partial<UpdateUserDto>) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const { role, skills, programId, creatorId, cityId, address, ...userFields } = updateUserDto;

    // Проверяем уникальность email, если указан
    if (userFields.email && userFields.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userFields.email },
      });
      if (existingUser) {
        throw new BadRequestException(`User with email ${userFields.email} already exists`);
      }
    }

    // Проверяем уникальность phone, если указан
    if (userFields.phone && userFields.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: userFields.phone },
      });
      if (existingUser) {
        throw new BadRequestException(`User with phone ${userFields.phone} already exists`);
      }
    }

    // Если изменяется роль, нужно пересоздать профиль
    if (role && role !== user.role) {
      return await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const needyRepository = manager.getRepository(Needy);
        const volunteerRepository = manager.getRepository(Volunteer);
        const adminRepository = manager.getRepository(Admin);
        const skillRepository = manager.getRepository(Skill);
        const programRepository = manager.getRepository(Program);

        // Удаляем старый профиль
        switch (user.role) {
          case UserRole.VOLUNTEER:
            await volunteerRepository.delete({ userId: id });
            break;
          case UserRole.NEEDY:
            await needyRepository.delete({ userId: id });
            break;
          case UserRole.ADMIN:
            await adminRepository.delete({ userId: id });
            break;
        }

        // Обновляем основные поля пользователя
        if (Object.keys(userFields).length > 0) {
          await userRepository.update(id, userFields);
        }
        await userRepository.update(id, { role });

        // Создаем новый профиль для новой роли
        const updatedUser = await userRepository.findOne({ where: { id } });
        if (!updatedUser) {
          throw new NotFoundException(`User with id ${id} not found`);
        }

        await this.createUserProfile(
          role,
          id,
          {
            skills,
            programId,
            creatorId,
            cityId,
            address,
          },
          {
            needyRepository,
            volunteerRepository,
            adminRepository,
            skillRepository,
            programRepository,
          },
        );

        return this.findOneWithRoleData(id);
      });
    }

    // Если роль не изменяется, просто обновляем поля пользователя
    if (Object.keys(userFields).length > 0) {
      await this.userRepository.update(id, userFields);
    }

    // Если обновляются skills, programId, cityId или address для существующей роли
    if (skills !== undefined || programId !== undefined || cityId !== undefined || address !== undefined) {
      return await this.dataSource.transaction(async (manager) => {
        const volunteerRepository = manager.getRepository(Volunteer);
        const needyRepository = manager.getRepository(Needy);
        const skillRepository = manager.getRepository(Skill);
        const programRepository = manager.getRepository(Program);

        switch (user.role) {
          case UserRole.VOLUNTEER:
            const volunteer = await volunteerRepository.findOne({
              where: { userId: id },
              relations: ['skills'],
            });

            if (volunteer) {
              if (skills !== undefined) {
                const skillEntities = skills.length > 0
                  ? await skillRepository.find({
                      where: skills.map((id) => ({ id })),
                    })
                  : [];

                if (skillEntities.length !== skills.length) {
                  const foundIds = skillEntities.map((s) => s.id);
                  const notFoundIds = skills.filter((id) => !foundIds.includes(id));
                  throw new BadRequestException(
                    `Skills with IDs ${notFoundIds.join(', ')} not found`,
                  );
                }

                volunteer.skills = skillEntities;
              }

              if (cityId !== undefined) {
                volunteer.cityId = cityId;
              }

              await volunteerRepository.save(volunteer);
            }
            break;

          case UserRole.NEEDY:
            const needy = await needyRepository.findOne({
              where: { userId: id },
            });

            if (needy) {
              if (programId !== undefined) {
                const program = await programRepository.findOne({
                  where: { id: programId },
                });
                if (!program) {
                  throw new BadRequestException(`Program with id ${programId} not found`);
                }
                needy.programId = programId;
              }

              if (cityId !== undefined) {
                needy.cityId = cityId;
              }

              if (address !== undefined) {
                needy.address = address;
              }

              await needyRepository.save(needy);
            }
            break;
        }

        return this.findOneWithRoleData(id);
      });
    }

    return this.findOneWithRoleData(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepository.delete(id);
    return user;
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash });
  }

  async invalidateRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: undefined });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async updatePhoneVerification(userId: string, isVerified: boolean): Promise<void> {
    // В текущей структуре нет поля isPhoneVerified, но можно добавить логику
    // Пока просто обновляем статус пользователя
    if (isVerified) {
      const user = await this.findById(userId);
      if (user && user.status === UserStatus.PENDING) {
        // Можно автоматически одобрять при верификации телефона, если нужно
        // await this.userRepository.update(userId, { status: UserStatus.APPROVED });
      }
    }
  }

  /**
   * Получает пользователя с расширенными данными в зависимости от роли
   * @param id - ID пользователя
   * @returns Пользователь с данными волонтера, нуждающегося или админа
   */
  async findOneWithRoleData(id: string): Promise<UserWithRoleData> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'phone',
        'email',
        'role',
        'status',
        'firstName',
        'lastName',
        'photo',
        'about',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
        'onboardingCompleted',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const { passwordHash: _, refreshTokenHash: __, ...userWithoutPassword } = user;

    // Получаем расширенные данные в зависимости от роли
    switch (user.role) {
      case UserRole.VOLUNTEER: {
        const volunteer = await this.volunteerRepository.findOne({
          where: { userId: id },
          relations: ['programs', 'skills', 'city'],
        });

        if (!volunteer) {
          throw new NotFoundException(`Volunteer data for user ${id} not found`);
        }

        const { user: _, programs, city, ...volunteerData } = volunteer;

        return {
          ...userWithoutPassword,
          role: UserRole.VOLUNTEER,
          profile: {
            ...volunteerData,
            programs,
            city,
          },
        } as UserWithVolunteerData;
      }

      case UserRole.NEEDY: {
        const needy = await this.needyRepository.findOne({
          where: { userId: id },
          relations: ['program', 'creator', 'city'],
          select: {
            creator: {
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
          throw new NotFoundException(`Needy data for user ${id} not found`);
        }

        const { user: _, program, creator, city, ...needyData } = needy;

        return {
          ...userWithoutPassword,
          role: UserRole.NEEDY,
          profile: {
            ...needyData,
            program,
            city,
            creator: creator ? sanitizeUser(creator) : undefined,
          },
        } as UserWithNeedyData;
      }

      case UserRole.ADMIN: {
        const admin = await this.adminRepository.findOne({
          where: { userId: id },
          relations: ['ownedPrograms', 'createdByAdmin'],
          select: {
            createdByAdmin: {
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

        if (!admin) {
          throw new NotFoundException(`Admin data for user ${id} not found`);
        }

        const { user: _, ownedPrograms, createdByAdmin, ...adminData } = admin;

        return {
          ...userWithoutPassword,
          role: UserRole.ADMIN,
          profile: {
            ...adminData,
            ownedPrograms,
            createdByAdmin: createdByAdmin ? sanitizeUser(createdByAdmin) : undefined,
          },
        } as UserWithAdminData;
      }

      default:
        throw new BadRequestException(`Unknown user role: ${user.role}`);
    }
  }
}
