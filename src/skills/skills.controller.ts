import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { QuerySkillsDto } from './dto/query.dto';
import { BulkUpdateSkillsDto } from './dto/bulk-update-skills.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  GetUserMetadata,
  UserMetadata,
} from 'src/shared/decorators/get-user.decorator';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createSkillDto: CreateSkillDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.skillsService.create(createSkillDto, user);
  }

  @Get()
  findAll(@Query() query: QuerySkillsDto) {
    return this.skillsService.findAll(query.categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
    return this.skillsService.update(id, updateSkillDto);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  bulkUpdate(@Body() bulkUpdateSkillsDto: BulkUpdateSkillsDto) {
    return this.skillsService.bulkUpdate(bulkUpdateSkillsDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @GetUserMetadata() user: UserMetadata) {
    return this.skillsService.remove(id, user);
  }
}
