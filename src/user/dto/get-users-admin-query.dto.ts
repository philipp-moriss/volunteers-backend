import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, UserRole } from 'src/shared/user/type';

export class GetUsersAdminQueryDto {
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
    description: 'Page number for pagination (1-based)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size for pagination',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search string for name, email or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
