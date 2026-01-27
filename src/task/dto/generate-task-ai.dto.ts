import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTaskAiDto {
  @ApiProperty({
    description: 'Text prompt from user describing the task',
    example: 'Нужно забрать ребенка из детского сада в 18:00',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
