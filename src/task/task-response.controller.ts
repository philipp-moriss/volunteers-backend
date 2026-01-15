import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskResponseService } from './task-response.service';
import { ApproveVolunteerDto } from './dto/approve-volunteer.dto';
import { RespondTaskDto } from './dto/respond-task.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';

@ApiTags('Task Responses')
@Controller('task-responses')
export class TaskResponseController {
  constructor(private readonly taskResponseService: TaskResponseService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Respond to a task (Volunteer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Post('task/:taskId/respond')
  respond(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    // @Body() respondTaskDto: RespondTaskDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskResponseService.respond(taskId, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel response to a task (Volunteer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Delete('task/:taskId/respond')
  cancelResponse(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskResponseService.cancelResponse(taskId, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all responses for a task (Needy - task owner)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY)
  @Get('task/:taskId')
  getByTaskId(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskResponseService.getByTaskId(taskId, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Approve a volunteer for a task (Needy)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY)
  @Post('task/:taskId/approve')
  approveVolunteer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() approveVolunteerDto: ApproveVolunteerDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskResponseService.approveVolunteer(taskId, approveVolunteerDto, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Reject a volunteer for a task (Needy)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY)
  @Post('task/:taskId/reject')
  rejectVolunteer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() approveVolunteerDto: ApproveVolunteerDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.taskResponseService.rejectVolunteer(taskId, approveVolunteerDto, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all responses by volunteer (Volunteer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Get('volunteer/:volunteerId')
  getByVolunteerId(
    @Param('volunteerId', ParseUUIDPipe) volunteerId: string,
    @GetUserMetadata() user: UserMetadata,
  ) {
    // Проверяем, что волонтер запрашивает свои отклики
    if (user.userId !== volunteerId) {
      throw new ForbiddenException('You can only view your own responses');
    }
    return this.taskResponseService.getByVolunteerId(volunteerId);
  }
}
