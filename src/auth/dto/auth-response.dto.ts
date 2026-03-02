import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/user/type';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string' },
      role: { enum: Object.values(UserRole) },
      status: { type: 'string', enum: ['pending', 'approved', 'blocked', 'rejected'] },
      phone: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      firstName: { type: 'string', nullable: true },
      lastName: { type: 'string', nullable: true },
    },
  })
  user: {
    id: string;
    role: UserRole;
    status?: string;
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}
