import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgramService } from './program.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';

@ApiTags('Program')
@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new program (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() createProgramDto: CreateProgramDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.programService.create(createProgramDto, user.userId);
  }

  @ApiOperation({ summary: 'Get all programs' })
  @Get()
  findAll() {
    return this.programService.findAll();
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get volunteers by program id' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.NEEDY)
  @Get(':id/volunteers')
  getVolunteers(@Param('id', ParseUUIDPipe) id: string) {
    return this.programService.getVolunteers(id);
  }

  @ApiOperation({ summary: 'Get a program by id' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.programService.findOne(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a program by id (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProgramDto: UpdateProgramDto,
  ) {
    return this.programService.update(id, updateProgramDto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete a program by id (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.programService.remove(id);
  }
}
