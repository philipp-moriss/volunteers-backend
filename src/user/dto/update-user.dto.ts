import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsEnum, IsEmail, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus, UserRole } from 'src/shared/user';
import { UUID } from 'crypto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ required: false, description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'User phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ required: false, description: 'Photo URL' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, description: 'About text' })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({ required: false, description: 'Program ID (for needy)' })
  @IsOptional()
  @IsUUID()
  programId?: UUID;

  @ApiProperty({ required: false, description: 'Skills array (for volunteer)', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false, description: 'Creator ID (required when changing role to needy)' })
  @IsOptional()
  @IsUUID()
  creatorId?: UUID;

  @ApiProperty({ required: false, description: 'City ID (for volunteer/needy)' })
  @IsOptional()
  @IsUUID()
  cityId?: UUID;

  @ApiProperty({ required: false, description: 'Address (for needy)' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Whether user has completed onboarding' })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
