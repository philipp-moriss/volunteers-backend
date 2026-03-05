import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFcmDto {
  @ApiProperty({ description: 'FCM token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Platform', enum: ['ios'] })
  @IsString()
  @IsIn(['ios'])
  platform: string;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
