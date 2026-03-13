import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}

