import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { UserRole } from 'src/shared/user/type';

@ApiTags('Admin - Database')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ 
    summary: 'Clear all data from database',
    description: '⚠️ WARNING: This will delete ALL data from ALL tables. Use with caution! Only available for ADMIN users.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tablesCleared: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/database/clear')
  async clearDatabase() {
    return this.appService.clearDatabase();
  }
}
