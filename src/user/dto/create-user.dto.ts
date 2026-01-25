import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID } from "class-validator";
import { UserRole, UserStatus } from "src/shared/user";
import { ApiProperty } from "@nestjs/swagger";
import { UUID } from "crypto";

export class CreateUserDto {
  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'The email of the user (for admin)',
    example: 'admin@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The phone of the user (for volunteer/needy)',
    example: '+79991234567',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;

  @ApiProperty({
    description: 'The role of the user',
    example: UserRole.VOLUNTEER,
    enum: UserRole,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    description: 'The status of the user',
    example: UserStatus.PENDING,
    enum: UserStatus,
    required: false,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsUUID()
  @IsOptional()
  programId?: UUID;

  @ApiProperty({
    description: 'Photo URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({
    description: 'About text',
    required: false,
  })
  @IsString()
  @IsOptional()
  about?: string;

  @ApiProperty({
    description: 'City ID (required for volunteer/needy)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  cityId?: UUID;

  @ApiProperty({
    description: 'Address (required for needy)',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Skills array (for volunteer)',
    type: [String],
    required: false,
  })
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
