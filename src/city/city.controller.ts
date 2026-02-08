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
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CityService } from './city.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { DeleteCitiesDto } from './dto/delete-cities.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';

@ApiTags('City')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new city (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCityDto: CreateCityDto) {
    return this.cityService.create(createCityDto);
  }

  @ApiOperation({ summary: 'Get all cities' })
  @Get()
  findAll() {
    return this.cityService.findAll();
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Initialize cities from Excel file (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Excel .xlsx with city names' },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('init')
  @UseInterceptors(FileInterceptor('file'))
  async initFromExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const isXlsx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname?.toLowerCase().endsWith('.xlsx');
    if (!isXlsx) {
      throw new BadRequestException('Only .xlsx files are allowed');
    }
    return this.cityService.initFromExcel(file.buffer);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete multiple cities by ids (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async removeMany(@Body() dto: DeleteCitiesDto) {
    return this.cityService.removeMany(dto.ids);
  }

  @ApiOperation({ summary: 'Get leaderboard statistics by cities' })
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.cityService.getLeaderboardStats(limitNum);
  }

  @ApiOperation({ summary: 'Get a city by id' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cityService.findOne(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a city by id (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCityDto: UpdateCityDto,
  ) {
    return this.cityService.update(id, updateCityDto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete a city by id (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.cityService.remove(id);
  }
}
