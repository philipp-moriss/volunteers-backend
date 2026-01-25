import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City } from './entities/city.entity';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private cityRepository: Repository<City>,
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
}
