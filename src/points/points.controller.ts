import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/user/type';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';

@ApiTags('Points')
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get volunteer points balance' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Get('balance')
  getBalance(@GetUserMetadata() user: UserMetadata) {
    return this.pointsService.getVolunteerBalance(user.userId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get volunteer points transactions history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VOLUNTEER)
  @Get('transactions')
  getTransactions(
    @GetUserMetadata() user: UserMetadata,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.pointsService.getVolunteerTransactions(user.userId, limitNum, offsetNum);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get volunteer points balance by ID (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('volunteer/:volunteerId/balance')
  getVolunteerBalance(@Param('volunteerId', ParseUUIDPipe) volunteerId: string) {
    return this.pointsService.getVolunteerBalance(volunteerId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get volunteer points transactions by ID (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('volunteer/:volunteerId/transactions')
  getVolunteerTransactions(
    @Param('volunteerId', ParseUUIDPipe) volunteerId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.pointsService.getVolunteerTransactions(volunteerId, limitNum, offsetNum);
  }
}
