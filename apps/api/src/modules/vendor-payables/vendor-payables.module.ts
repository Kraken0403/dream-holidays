import { Module } from '@nestjs/common';
import { VendorPayablesController } from './vendor-payables.controller';
import { VendorPayablesService } from './vendor-payables.service';

@Module({ controllers: [VendorPayablesController], providers: [VendorPayablesService] })
export class VendorPayablesModule {}
