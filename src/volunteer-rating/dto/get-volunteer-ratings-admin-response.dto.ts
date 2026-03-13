import { ApiProperty } from '@nestjs/swagger';

export class VolunteerRatingAdminItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  score: number;

  @ApiProperty({ required: false })
  comment?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  volunteerUserId: string;

  @ApiProperty({ required: false })
  volunteerFirstName?: string | null;

  @ApiProperty({ required: false })
  volunteerLastName?: string | null;

  @ApiProperty({ required: false })
  volunteerPhone?: string | null;

  @ApiProperty({ required: false })
  volunteerEmail?: string | null;

  @ApiProperty()
  taskId: string;
}

export class GetVolunteerRatingsAdminResponseDto {
  @ApiProperty({ type: [VolunteerRatingAdminItemDto] })
  items: VolunteerRatingAdminItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

