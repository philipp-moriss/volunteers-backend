import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NeedyInvitation } from './entities/needy-invitation.entity';
import { NeedyInviteService } from './needy-invite.service';
import { NeedyInviteController } from './needy-invite.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NeedyInvitation]),
    ConfigModule,
    UserModule,
  ],
  controllers: [NeedyInviteController],
  providers: [NeedyInviteService],
  exports: [NeedyInviteService],
})
export class NeedyInviteModule {}
