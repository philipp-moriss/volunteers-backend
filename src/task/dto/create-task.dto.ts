import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class CreateTaskDto {
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
    description: 'The type of help',
    example: 'Покупки/Доставка',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'The title of the task',
    example: 'Забрать ребенка из садика',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The description of the task',
    example: 'Нужно забрать ребенка из детского сада в 18:00',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Additional details and answers to clarifying questions',
    example: 'Ребенок в группе №3, имя воспитателя - Мария Ивановна',
    required: false,
  })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiProperty({
    description: 'Points for completing the task',
    example: 10,
    default: 10,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  points?: number;

  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: UUID;

  @ApiProperty({
    description: 'Array of skill IDs required for the task',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  skillIds?: UUID[];

  @ApiProperty({
    description: 'First response mode (auto-assign first volunteer)',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  firstResponseMode?: boolean;
}
