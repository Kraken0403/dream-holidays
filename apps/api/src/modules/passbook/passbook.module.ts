import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PassbookController } from './passbook.controller';
import { PassbookService } from './passbook.service';

@Module({
  imports: [PrismaModule],
  controllers: [PassbookController],
  providers: [PassbookService],
})
export class PassbookModule {}
