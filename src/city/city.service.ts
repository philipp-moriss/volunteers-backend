import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City } from './entities/city.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { User } from 'src/user/entities/user.entity';
import { UserRole } from 'src/shared/user/type';

/** Координаты по умолчанию (центр Израиля) для городов из Excel без координат */
const DEFAULT_LATITUDE = 31.5;
const DEFAULT_LONGITUDE = 34.75;

export interface CityLeaderboardStats {
  id: string;
  name: string;
  volunteers: number;
  points: number;
  rank: number;
}

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private cityRepository: Repository<City>,
    @InjectRepository(Volunteer)
    private volunteerRepository: Repository<Volunteer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createCityDto: CreateCityDto): Promise<City> {
    // Проверяем уникальность названия города
    const existingCity = await this.cityRepository.findOne({
      where: { name: createCityDto.name },
    });

    if (existingCity) {
      throw new BadRequestException(`City with name "${createCityDto.name}" already exists`);
    }

    // Создаем Point для PostGIS из координат
    const location = {
      type: 'Point',
      coordinates: [createCityDto.longitude, createCityDto.latitude], // [longitude, latitude] для GeoJSON
    };

    const city = this.cityRepository.create({
      name: createCityDto.name,
      latitude: createCityDto.latitude,
      longitude: createCityDto.longitude,
      location: location as any, // TypeORM требует any для geometry типа
    });

    return this.cityRepository.save(city);
  }

  async findAll(): Promise<Array<City & { volunteers: Array<{
    id: string;
    phone?: string;
    email?: string;
    role: string;
    status: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
    about?: string;
    language?: string;
    onboardingCompleted: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }> }>> {
    const cities = await this.cityRepository.find({
      order: {
        name: 'ASC',
      },
    });

    // Получаем волонтеров для каждого города
    const citiesWithVolunteers = await Promise.all(
      cities.map(async (city) => {
        const volunteers = await this.volunteerRepository
          .createQueryBuilder('volunteer')
          .innerJoinAndSelect('volunteer.user', 'user')
          .leftJoinAndSelect('volunteer.city', 'city')
          .where('volunteer.cityId = :cityId', { cityId: city.id })
          .andWhere('user.role = :role', { role: UserRole.VOLUNTEER })
          .getMany();

        const users = volunteers
          .map((volunteer) => volunteer.user)
          .filter((user): user is User => user !== null && user !== undefined)
          .map((user) => {
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
              language: user.language,
              onboardingCompleted: user.onboardingCompleted,
              createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
              lastLoginAt: user.lastLoginAt?.toISOString(),
            };
          });

        return {
          ...city,
          volunteers: users,
        };
      }),
    );

    return citiesWithVolunteers;
  }

  async findOne(id: string): Promise<City> {
    const city = await this.cityRepository.findOne({
      where: { id },
    });

    if (!city) {
      throw new NotFoundException(`City with id ${id} not found`);
    }

    return city;
  }

  async update(id: string, updateCityDto: UpdateCityDto): Promise<City> {
    const city = await this.findOne(id);

    // Если обновляются координаты, обновляем location
    if (updateCityDto.latitude !== undefined || updateCityDto.longitude !== undefined) {
      const latitude = updateCityDto.latitude ?? city.latitude;
      const longitude = updateCityDto.longitude ?? city.longitude;

      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };

      await this.cityRepository.update(id, {
        ...updateCityDto,
        location: location as any,
      });
    } else {
      await this.cityRepository.update(id, updateCityDto);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<City> {
    const city = await this.findOne(id);
    await this.cityRepository.delete(id);
    return city;
  }

  /**
   * Массовое удаление городов по списку id
   */
  async removeMany(ids: string[]): Promise<{ deleted: number; notFound: string[] }> {
    const notFound: string[] = [];
    let deleted = 0;
    for (const id of ids) {
      const city = await this.cityRepository.findOne({ where: { id } });
      if (!city) {
        notFound.push(id);
        continue;
      }
      await this.cityRepository.delete(id);
      deleted++;
    }
    return { deleted, notFound };
  }

  /**
   * Инициализация городов из Excel (.xlsx).
   * Собирает уникальные непустые названия из всех ячеек листа.
   * Координаты по умолчанию (центр Израиля), если в файле нет колонок с координатами.
   */
  async initFromExcel(buffer: Buffer): Promise<{ created: number; skipped: number; names: string[] }> {
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExcelJS typings conflict with Node Buffer
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const nameSet = new Set<string>();
    sheet.eachRow((row, _rowNumber) => {
      row.eachCell((cell) => {
        const value = cell.value;
        const str = value != null ? String(value).trim() : '';
        // Пропускаем пустые и чисто числовые значения (например заголовки 1,2,3)
        if (str && isNaN(Number(str))) {
          nameSet.add(str);
        }
      });
    });

    const names = Array.from(nameSet);
    let created = 0;
    let skipped = 0;

    for (const name of names) {
      const existing = await this.cityRepository.findOne({ where: { name } });
      if (existing) {
        skipped++;
        continue;
      }
      const location = {
        type: 'Point',
        coordinates: [DEFAULT_LONGITUDE, DEFAULT_LATITUDE],
      };
      const city = this.cityRepository.create({
        name,
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        location: location as any,
      });
      await this.cityRepository.save(city);
      created++;
    }

    return { created, skipped, names };
  }

  /**
   * Получить статистику по городам для лидерборда
   * Возвращает города с количеством волонтеров и суммой очков, отсортированные по количеству волонтеров
   */
  async getLeaderboardStats(limit?: number): Promise<CityLeaderboardStats[]> {
    const cities = await this.cityRepository.find({
      order: {
        name: 'ASC',
      },
    });

    const stats = await Promise.all(
      cities.map(async (city) => {
        const volunteers = await this.volunteerRepository.find({
          where: { cityId: city.id },
          select: ['points'],
        });

        const volunteersCount = volunteers.length;
        const totalPoints = volunteers.reduce((sum, v) => sum + v.points, 0);

        return {
          id: city.id,
          name: city.name,
          volunteers: volunteersCount,
          points: totalPoints,
          rank: 0, // Будет установлен после сортировки
        };
      }),
    );

    // Сортируем по количеству волонтеров (по убыванию), затем по очкам
    stats.sort((a, b) => {
      if (b.volunteers !== a.volunteers) {
        return b.volunteers - a.volunteers;
      }
      return b.points - a.points;
    });

    // Устанавливаем ранги
    stats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    // Фильтруем города без волонтеров и применяем лимит
    const filteredStats = stats.filter((stat) => stat.volunteers > 0);
    return limit ? filteredStats.slice(0, limit) : filteredStats;
  }
}
