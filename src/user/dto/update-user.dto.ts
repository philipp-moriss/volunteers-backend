import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from 'src/shared/user';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ required: false, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
