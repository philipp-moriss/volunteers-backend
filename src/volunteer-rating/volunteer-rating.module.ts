import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteerRating } from './entities/volunteer-rating.entity';
import { VolunteerRatingService } from './volunteer-rating.service';
import { VolunteerRatingController } from './volunteer-rating.controller';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Task } from 'src/task/entities/task.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VolunteerRating, Volunteer, Task, User])],
  controllers: [VolunteerRatingController],
  providers: [VolunteerRatingService],
  exports: [VolunteerRatingService],
})
export class VolunteerRatingModule {}

