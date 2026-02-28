import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedyInvitation } from './entities/needy-invitation.entity';
import { RegisterNeedyDto } from './dto/register-needy.dto';
import { UUID } from 'crypto';
import { UserService } from 'src/user/user.service';
import { UserRole, UserStatus } from 'src/shared/user';

@Injectable()
export class NeedyInviteService {
  private readonly logger = new Logger(NeedyInviteService.name);

  constructor(
    @InjectRepository(NeedyInvitation)
    private readonly inviteRepository: Repository<NeedyInvitation>,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async createInvite(creatorId: string): Promise<{ url: string }> {
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = this.inviteRepository.create({
      token,
      creatorId,
      expiresAt,
    });
    await this.inviteRepository.save(invite);

    const baseUrl =
      this.configService.get<string>('VOLUNTEERS_FRONT_URL') ||
      'https://volunteers-front.vercel.app';
    const url = `${baseUrl}/needy-register?token=${token}`;

    return { url };
  }

  async registerByToken(dto: RegisterNeedyDto): Promise<{ userId: string }> {
    const invite = await this.inviteRepository.findOne({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invitation has already been used');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    const formattedPhone = this.formatPhone(dto.phone);
    const user = await this.userService.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: formattedPhone,
        role: UserRole.NEEDY,
        status: UserStatus.PENDING,
        programId: dto.programId as UUID,
        cityId: dto.cityId as UUID,
        address: dto.address,
      },
      invite.creatorId,
    );

    invite.usedAt = new Date();
    await this.inviteRepository.save(invite);

    this.logger.log(`Needy registered via invite: userId=${user.id}`);
    return { userId: user.id };
  }

  private formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) return '+7' + digits.substring(1);
    if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
    return phone.startsWith('+') ? phone : '+' + digits;
  }
}
