import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class CreateTaskAiDto {
  @ApiProperty({
    description: 'Text prompt from user describing the task',
    example: 'Нужно забрать ребенка из детского сада в 18:00',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({
    description: 'The program ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  programId: UUID;

  @ApiProperty({
    description: 'The needy user ID (creator of the task)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  needyId: UUID;

  @ApiProperty({
    description: 'Override AI-selected category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: UUID;

  @ApiProperty({
    description: 'Override AI-selected points',
    example: 20,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  points?: number;

  @ApiProperty({
    description: 'Override AI-selected first response mode',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  firstResponseMode?: boolean;
}
