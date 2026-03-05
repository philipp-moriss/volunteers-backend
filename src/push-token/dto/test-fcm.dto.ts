import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestFcmDto {
  @ApiProperty({
    description: 'FCM device token (можно взять из GET /push/fcm/tokens)',
    example: 'fXyZ123...your-fcm-token',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'Заголовок уведомления', example: 'Test FCM' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Текст уведомления', example: 'Test notification from backend' })
  @IsOptional()
  @IsString()
  body?: string;
}
