import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramService } from './program.service';
import { ProgramController } from './program.controller';
import { Program } from './entities/program.entity';
import { Admin } from 'src/user/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Program, Admin])],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
