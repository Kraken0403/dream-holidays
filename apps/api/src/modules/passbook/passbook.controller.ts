import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PassbookService } from './passbook.service';

@UseGuards(JwtAuthGuard)
@Controller('passbook')
export class PassbookController {
  constructor(private readonly service: PassbookService) {}

  @Get('clients')
  listClients() { return this.service.listClients(); }

  @Get('vendors')
  listVendors() { return this.service.listVendors(); }

  @Get('client/all')
  allClientsPassbook(@Query() query: any) {
    return this.service.allClientsPassbook(query);
  }

  @Get('vendor/all')
  allVendorsPassbook(@Query() query: any) {
    return this.service.allVendorsPassbook(query);
  }

  @Get('client/:clientId')
  clientPassbook(@Param('clientId') id: string, @Query() query: any) {
    return this.service.clientPassbook(Number(id), query);
  }

  @Get('vendor/:vendorId')
  vendorPassbook(@Param('vendorId') id: string, @Query() query: any) {
    return this.service.vendorPassbook(Number(id), query);
  }
}
