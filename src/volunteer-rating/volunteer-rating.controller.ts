import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VolunteerRatingService } from './volunteer-rating.service';
import { CreateVolunteerRatingDto } from './dto/create-volunteer-rating.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { GetVolunteerRatingDto } from './dto/get-volunteer-rating.dto';

@ApiTags('Volunteer Ratings')
@Controller('volunteers')
export class VolunteerRatingController {
  constructor(private readonly volunteerRatingService: VolunteerRatingService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rate a volunteer for a completed task' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN)
  @Post(':volunteerId/rating')
  rateVolunteer(
    @Param('volunteerId', ParseUUIDPipe) volunteerId: string,
    @Body() createVolunteerRatingDto: CreateVolunteerRatingDto,
    @GetUserMetadata() user: UserMetadata,
  ) {
    return this.volunteerRatingService.createRating(volunteerId, createVolunteerRatingDto, user);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all ratings for a volunteer' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NEEDY, UserRole.ADMIN, UserRole.VOLUNTEER)
  @Get(':volunteerId/ratings')
  getRatings(@Param('volunteerId', ParseUUIDPipe) volunteerId: string): Promise<GetVolunteerRatingDto[]> {
    return this.volunteerRatingService.getRatings(volunteerId);
  }
}

