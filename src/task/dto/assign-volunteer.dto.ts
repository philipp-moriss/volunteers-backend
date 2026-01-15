import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class AssignVolunteerDto {
  @ApiProperty({
    description: 'The volunteer user ID to assign to the task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  volunteerId: UUID;
}
