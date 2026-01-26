import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Category 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The icon SVG of the category (deprecated, use imageId instead)',
    example: '<svg>...</svg>',
    required: false,
  })
  @IsString()
  @IsOptional()
  iconSvg?: string;

  @ApiProperty({
    description: 'The image ID for the category icon',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  imageId?: string;
}
