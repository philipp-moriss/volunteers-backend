import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCityGroupCitiesDto {
  @ApiProperty({
    description: 'City IDs belonging to the group',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  cityIds: string[];
}
