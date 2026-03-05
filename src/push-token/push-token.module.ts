import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './entities/push-token.entity';
import { PushTokenService } from './push-token.service';
import { PushTokenController } from './push-token.controller';
import { FcmModule } from 'src/fcm/fcm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushToken]),
    FcmModule,
  ],
  controllers: [PushTokenController],
  providers: [PushTokenService],
  exports: [PushTokenService],
})
export class PushTokenModule {}
