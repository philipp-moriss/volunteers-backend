import { IsString, IsNotEmpty } from 'class-validator';
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
    description: 'The icon SVG of the category',
    example: '<svg>...</svg>',
  })
  @IsString()
  @IsNotEmpty()
  iconSvg: string;
}
