import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskResponseService } from './task-response.service';
import { TaskResponseController } from './task-response.controller';
import { Task } from './entities/task.entity';
import { TaskResponse } from './entities/task-response.entity';
import { User } from 'src/user/entities/user.entity';
import { Needy } from 'src/user/entities/needy.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Program } from 'src/program/entities/program.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskResponse,
      User,
      Needy,
      Volunteer,
      Program,
      Skill,
      Category,
    ]),
  ],
  controllers: [TaskController, TaskResponseController],
  providers: [TaskService, TaskResponseService],
  exports: [TaskService, TaskResponseService],
})
export class TaskModule {}
