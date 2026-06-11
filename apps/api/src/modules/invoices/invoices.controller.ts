import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Post('from-booking/:bookingId')
  createFromBooking(@Param('bookingId') bookingId: string, @Body() body: any) {
    return this.service.createFromBooking(Number(bookingId), body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(Number(id)); }

  @Post()
  create(@Body() body: any) { return this.service.createManual(body); }

  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.service.recordPayment(Number(id), body);
  }
}
