import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthCheckModule } from 'src/healthCheck/healthCheck.module';
import { User } from 'src/user/entities/user.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';
import { Needy } from 'src/user/entities/needy.entity';
import { Admin } from 'src/user/entities/admin.entity';
import { Image } from 'src/image/entities/image.entity';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';


import { FcmModule } from 'src/fcm/fcm.module';
import { VerificationCode } from 'src/auth/entities/verification-code.entity';
import { ProgramModule } from 'src/program/program.module';
import { Program } from 'src/program/entities/program.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { CategoriesModule } from 'src/categories/categories.module';
import { SkillsModule } from 'src/skills/skills.module';
import { TaskModule } from 'src/task/task.module';
import { Task } from 'src/task/entities/task.entity';
import { TaskResponse } from 'src/task/entities/task-response.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          synchronize: true,
          timezone: 'UTC',
          dateStrings: true,
          extra: {
            options: '-c timezone=UTC',
          },
          entities: [
            User,
            Volunteer,
            VerificationCode,
            Needy,
            Admin,
            Image,
            Program,
            Category,
            Skill,
            Task,
            TaskResponse,
          ],
        };
      },
    }),
    AuthModule,
    HealthCheckModule,
    UserModule,
    FcmModule,
    ProgramModule,
    CategoriesModule,
    SkillsModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
