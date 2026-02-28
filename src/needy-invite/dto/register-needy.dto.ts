import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterNeedyDto {
  @ApiProperty({ description: 'Invitation token from registration link' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  programId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;
}
