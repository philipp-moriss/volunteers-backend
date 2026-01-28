import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkUpdateSkillItemDto {
  @ApiProperty({
    description: 'ID навыка',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Новое имя навыка',
    example: 'Новый навык',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Новая SVG-иконка навыка',
    example: '<svg>...</svg>',
  })
  @IsString()
  @IsNotEmpty()
  iconSvg: string;
}

export class BulkUpdateSkillsDto {
  @ApiProperty({
    description: 'Список навыков для массового обновления',
    type: [BulkUpdateSkillItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateSkillItemDto)
  @IsNotEmpty()
  items: BulkUpdateSkillItemDto[];
}

