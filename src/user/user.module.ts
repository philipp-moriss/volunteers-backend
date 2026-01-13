import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Volunteer } from './entities/volunteer.entity';
import { Needy } from './entities/needy.entity';
import { Admin } from './entities/admin.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { Program } from 'src/program/entities/program.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Volunteer, Needy, Admin, Skill, Program]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
