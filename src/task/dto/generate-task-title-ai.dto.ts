import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class GenerateTaskTitleCategoryDto {
  @ApiProperty({
    description: 'ID выбранной категории',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Название выбранной категории',
    example: 'Покупки/Доставка',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

class GenerateTaskTitleSkillDto {
  @ApiProperty({
    description: 'ID навыка',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Название навыка',
    example: 'Покупки',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'ID категории, к которой относится навык',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}

export class GenerateTaskTitleAiDto {
  @ApiProperty({
    description:
      'Язык, на котором должен быть сгенерирован текст (русский / английский / иврит)',
    example: 'русский',
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    description: 'Выбранная пользователем категория',
    type: GenerateTaskTitleCategoryDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GenerateTaskTitleCategoryDto)
  category: GenerateTaskTitleCategoryDto;

  @ApiProperty({
    description: 'Список выбранных пользователем навыков',
    type: [GenerateTaskTitleSkillDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateTaskTitleSkillDto)
  skills: GenerateTaskTitleSkillDto[];
}

