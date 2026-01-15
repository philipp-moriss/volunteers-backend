import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskApproveRole } from '../types/task-approve-role.enum';

export class ApproveTaskDto {
  @ApiProperty({
    description: 'The role of the person approving the task completion',
    enum: TaskApproveRole,
    example: TaskApproveRole.VOLUNTEER,
  })
  @IsEnum(TaskApproveRole)
  @IsNotEmpty()
  role: TaskApproveRole;
}
