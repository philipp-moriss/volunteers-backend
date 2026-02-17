import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetVolunteerRatingDto {
  @ApiProperty({
    description: 'ID оценки',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Оценка волонтёра по шкале от 1 до 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({
    description: 'Текстовый отзыв о волонтёре',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({
    description: 'Дата создания оценки',
    example: '2021-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;
}

