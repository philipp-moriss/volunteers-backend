import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus, UserRole } from 'src/shared/user/type';

export class ExportUsersDto {
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Search string for name, email or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

