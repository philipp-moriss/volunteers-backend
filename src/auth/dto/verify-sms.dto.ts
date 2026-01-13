import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifySmsDto {
  @ApiProperty({ example: '+79991234567', description: 'Номер телефона' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: 'Код верификации (6 символов)' })
  @IsString()
  @Length(6, 6)
  code: string;
}
