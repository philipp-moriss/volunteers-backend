import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class CreateSkillDto {
  @ApiProperty({
    description: 'The name of the skill',
    example: 'Skill 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The icon SVG of the skill',
    example: '<svg>...</svg>',
  })
  @IsString()
  @IsNotEmpty()
  iconSvg: string;

  @ApiProperty({
    description: 'The category ID of the skill',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: UUID;
}
