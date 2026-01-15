import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { AssignVolunteerDto } from './dto/assign-volunteer.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { TaskStatus } from './types/task-status.enum';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new task (Needy or Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN)
  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.create(createTaskDto, user);
  }

  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiQuery({ name: 'programId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'skillIds', required: false, type: [String] })
  @Get()
  findAll(
    @Query('programId') programId?: string,
    @Query('status') status?: TaskStatus,
    @Query('categoryId') categoryId?: string,
    @Query('skillIds') skillIds?: string | string[],
  ) {
    const skillIdsArray = skillIds
      ? Array.isArray(skillIds)
        ? skillIds
        : [skillIds]
      : undefined;

    return this.taskService.findAll(programId, {
      status,
      categoryId,
      skillIds: skillIdsArray,
    });
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get my tasks (Needy)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY)
  @Get('my')
  getMyTasks(@GetUserMetadata() user: UserMetadata) {
    return this.taskService.getMyTasks(user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get assigned tasks (Volunteer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Get('assigned')
  getAssignedTasks(@GetUserMetadata() user: UserMetadata) {
    return this.taskService.getAssignedTasks(user);
  }

  @ApiOperation({ summary: 'Get a task by id' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findOne(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a task (Needy or Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.update(id, updateTaskDto, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete/Cancel a task (Needy or Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.remove(id, user);
  }


  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Assign a volunteer to a task (Needy or Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN)
  @Post(':id/assign')
  assignVolunteer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignVolunteerDto: AssignVolunteerDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.assignVolunteer(id, assignVolunteerDto, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel assignment of a volunteer (Needy or Volunteer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.VOLUNTEER)
  @Post(':id/cancel-assignment')
  cancelAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.cancelAssignment(id, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Approve task completion (Volunteer or Needy)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER, UserRole.NEEDY)
  @Post(':id/complete')
  approveCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveTaskDto: ApproveTaskDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskService.approveCompletion(id, approveTaskDto, user);
  }
}
