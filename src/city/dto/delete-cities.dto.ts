import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class DeleteCitiesDto {
  @ApiProperty({
    description: 'Array of city IDs to delete',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}
