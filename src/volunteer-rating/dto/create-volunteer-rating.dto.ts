import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateVolunteerRatingDto {
  @ApiProperty({
    description: 'ID задачи, за выполнение которой оставляется отзыв',
    format: 'uuid',
  })
  @IsUUID()
  taskId: string;

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
}

