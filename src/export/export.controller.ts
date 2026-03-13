import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ExportUsersDto } from './dto/export-users.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { UserRole } from 'src/shared/user/type';

@ApiTags('export')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('xls/users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export users to Excel' })
  @ApiResponse({
    status: 200,
    description: 'Excel file with users',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportXlsUsers(@Query() query: ExportUsersDto, @Res() res: Response) {
    const buffer = await this.exportService.exportUsers(query);

    const filename = `users-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.header('Content-Disposition', `attachment; filename=${filename}`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }
}

