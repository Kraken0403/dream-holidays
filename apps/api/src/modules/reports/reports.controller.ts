import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  dashboard(@Query() query: any) { return this.service.dashboard(query); }

  @Get('aging/receivables')
  agingReceivables() { return this.service.agingReceivables(); }

  @Get('aging/payables')
  agingPayables() { return this.service.agingPayables(); }

  @Get('pl')
  profitAndLoss(@Query() query: any) { return this.service.profitAndLoss(query); }

  @Get('trial-balance')
  trialBalance(@Query() query: any) { return this.service.trialBalance(query); }

  @Get('clients')
  listClients() { return this.service.listClients(); }

  @Get('vendors')
  listVendors() { return this.service.listVendors(); }

  @Get('client-statement/:id')
  clientStatement(@Param('id') id: string, @Query() query: any) { return this.service.clientStatement(Number(id), query); }

  @Get('vendor-statement/:id')
  vendorStatement(@Param('id') id: string, @Query() query: any) { return this.service.vendorStatement(Number(id), query); }
}
