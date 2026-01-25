import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City } from './entities/city.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';

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

  async findAll(): Promise<City[]> {
    return this.cityRepository.find({
      order: {
        name: 'ASC',
      },
    });
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
