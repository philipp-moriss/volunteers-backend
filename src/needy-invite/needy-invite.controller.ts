import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { UserRole } from 'src/shared/user/type';
import { NeedyInviteService } from './needy-invite.service';
import { RegisterNeedyDto } from './dto/register-needy.dto';

@ApiTags('Needy Invite')
@Controller('needy')
export class NeedyInviteController {
  constructor(private readonly needyInviteService: NeedyInviteService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create invite link for needy registration (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('invite')
  createInvite(@GetUserMetadata() admin: UserMetadata) {
    return this.needyInviteService.createInvite(admin.userId);
  }

  @ApiOperation({ summary: 'Register needy by invitation token (Public)' })
  @Post('register')
  register(@Body() dto: RegisterNeedyDto) {
    return this.needyInviteService.registerByToken(dto);
  }
}
