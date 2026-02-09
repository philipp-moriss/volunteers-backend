import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CityGroup } from './entities/city-group.entity';
import { City } from 'src/city/entities/city.entity';
import { CreateCityGroupDto } from './dto/create-city-group.dto';
import { UpdateCityGroupDto } from './dto/update-city-group.dto';
import { SetCityGroupCitiesDto } from './dto/set-city-group-cities.dto';

@Injectable()
export class CityGroupService {
  constructor(
    @InjectRepository(CityGroup)
    private readonly cityGroupRepository: Repository<CityGroup>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async create(dto: CreateCityGroupDto): Promise<CityGroup> {
    const group = this.cityGroupRepository.create({ name: dto.name });
    const saved = await this.cityGroupRepository.save(group);
    if (dto.cityIds?.length) {
      await this.setCitiesInternal(saved.id, dto.cityIds);
    }
    return this.findOne(saved.id);
  }

  async findAll(): Promise<CityGroup[]> {
    return this.cityGroupRepository.find({
      relations: ['cities'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CityGroup> {
    const group = await this.cityGroupRepository.findOne({
      where: { id },
      relations: ['cities'],
    });
    if (!group) {
      throw new NotFoundException(`City group with id ${id} not found`);
    }
    return group;
  }

  async update(id: string, dto: UpdateCityGroupDto): Promise<CityGroup> {
    await this.findOne(id);
    await this.cityGroupRepository.update(id, { name: dto.name });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.cityRepository.update({ groupId: id }, { groupId: null });
    await this.cityGroupRepository.delete(id);
  }

  async setCities(groupId: string, dto: SetCityGroupCitiesDto): Promise<CityGroup> {
    await this.findOne(groupId);
    await this.setCitiesInternal(groupId, dto.cityIds);
    return this.findOne(groupId);
  }

  /**
   * Returns city IDs that should be used for task filtering for a volunteer with this city.
   * If city is in a group, returns all city IDs in that group; otherwise returns [cityId].
   */
  async getCityIdsForCity(cityId: string): Promise<string[]> {
    const city = await this.cityRepository.findOne({
      where: { id: cityId },
      relations: ['group', 'group.cities'],
    });
    if (!city) {
      return [];
    }
    if (!city.groupId || !city.group?.cities?.length) {
      return [cityId];
    }
    return city.group.cities.map((c) => c.id);
  }

  private async setCitiesInternal(groupId: string, cityIds: string[]): Promise<void> {
    for (const cid of cityIds) {
      const city = await this.cityRepository.findOne({ where: { id: cid } });
      if (!city) {
        throw new NotFoundException(`City with id ${cid} not found`);
      }
      if (city.groupId && city.groupId !== groupId) {
        throw new BadRequestException(
          `City ${cid} already belongs to another group. Remove it from that group first.`,
        );
      }
    }
    await this.cityRepository.update({ groupId }, { groupId: null });
    if (cityIds.length) {
      await this.cityRepository
        .createQueryBuilder()
        .update(City)
        .set({ groupId })
        .where('id IN (:...ids)', { ids: cityIds })
        .execute();
    }
  }
}
