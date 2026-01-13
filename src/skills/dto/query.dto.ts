import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { UUID } from "crypto";

export class QuerySkillsDto {
  @ApiProperty({
    description: 'The category ID of the skill',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: UUID;
}