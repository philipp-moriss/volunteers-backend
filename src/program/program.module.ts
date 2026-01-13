import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramService } from './program.service';
import { ProgramController } from './program.controller';
import { Program } from './entities/program.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Program])],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
