import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokensDto {
  @ApiProperty({ description: 'Access token (может быть истекшим)' })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
