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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CityGroupService } from './city-group.service';
import { CreateCityGroupDto } from './dto/create-city-group.dto';
import { UpdateCityGroupDto } from './dto/update-city-group.dto';
import { SetCityGroupCitiesDto } from './dto/set-city-group-cities.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';

@ApiTags('City Groups')
@Controller('city-groups')
export class CityGroupController {
  constructor(private readonly cityGroupService: CityGroupService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create city group (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCityGroupDto) {
    return this.cityGroupService.create(dto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all city groups (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.cityGroupService.findAll();
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get city group by id (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cityGroupService.findOne(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update city group (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityGroupDto,
  ) {
    return this.cityGroupService.update(id, dto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete city group (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.cityGroupService.remove(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Set cities in group (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/cities')
  setCities(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCityGroupCitiesDto,
  ) {
    return this.cityGroupService.setCities(id, dto);
  }
}
