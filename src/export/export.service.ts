import * as ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { ExportUsersDto } from './dto/export-users.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class ExportService {
  constructor(private readonly userService: UserService) {}

  private formatDate(date?: Date | string | null): string {
    if (!date) {
      return '';
    }

    const value = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) {
      return '';
    }

    return value.toISOString();
  }

  async exportUsers(filters: ExportUsersDto): Promise<ExcelJS.Buffer> {
    const users = await this.userService.findForExport({
      status: filters.status,
      role: filters.role,
      search: filters.search,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Onboarding Completed', key: 'onboardingCompleted', width: 20 },
      { header: 'Approved By ID', key: 'approvedById', width: 36 },
      { header: 'Approved At', key: 'approvedAt', width: 25 },
      { header: 'Last Login At', key: 'lastLoginAt', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 25 },
      { header: 'Updated At', key: 'updatedAt', width: 25 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    users.forEach((user: User) => {
      worksheet.addRow({
        id: user.id,
        phone: user.phone || '',
        email: user.email || '',
        role: user.role,
        status: user.status,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        onboardingCompleted: user.onboardingCompleted ? 'yes' : 'no',
        approvedById: user.approvedById || '',
        approvedAt: this.formatDate(user.approvedAt),
        lastLoginAt: this.formatDate(user.lastLoginAt),
        createdAt: this.formatDate(user.createdAt),
        updatedAt: this.formatDate(user.updatedAt),
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExcelJS typings conflict with Node Buffer
    return workbook.xlsx.writeBuffer() as any;
  }
}

