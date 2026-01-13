import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Program } from './entities/program.entity';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
  ) {}

  async create(createProgramDto: CreateProgramDto, ownerId: string): Promise<Program> {
    const program = this.programRepository.create({
      name: createProgramDto.name,
      description: createProgramDto.description,
      isActive: createProgramDto.isActive ?? true,
      ownerId,
    });

    return this.programRepository.save(program);
  }

  async findAll(): Promise<Program[]> {
    return this.programRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException(`Program with id ${id} not found`);
    }

    return program;
  }

  async update(id: string, updateProgramDto: UpdateProgramDto): Promise<Program> {
    const program = await this.findOne(id);

    await this.programRepository.update(id, updateProgramDto);

    return this.findOne(id);
  }

  async remove(id: string): Promise<Program> {
    const program = await this.findOne(id);
    await this.programRepository.delete(id);
    return program;
  }
}
