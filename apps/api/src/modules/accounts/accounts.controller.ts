import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  chartOfAccounts() { return this.service.chartOfAccounts(); }

  @Get('ledger/:accountId')
  ledger(@Param('accountId') id: string, @Query() query: any) {
    return this.service.ledger(Number(id), query);
  }

  @Post('journal')
  createEntry(@Body() body: any) { return this.service.createManualEntry(body); }
}
