import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CityGroup } from './entities/city-group.entity';
import { City } from 'src/city/entities/city.entity';
import { CityGroupService } from './city-group.service';
import { CityGroupController } from './city-group.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CityGroup, City]),
  ],
  controllers: [CityGroupController],
  providers: [CityGroupService],
  exports: [CityGroupService],
})
export class CityGroupModule {}
