import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get('from-booking/:bookingId/preview')
  previewFromBooking(@Param('bookingId') bookingId: string) {
    return this.service.previewFromBooking(Number(bookingId));
  }

  @Post('from-booking/:bookingId')
  createFromBooking(@Param('bookingId') bookingId: string, @Body() body: any) {
    return this.service.createFromBooking(Number(bookingId), body);
  }

  @Get(':id/deletion-preview')
  deletionPreview(@Param('id') id: string) { return this.service.deletionPreview(Number(id)); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(Number(id)); }

  @Post()
  create(@Body() body: any) { return this.service.createManual(body); }

  @Post(':id/convert')
  convertProforma(@Param('id') id: string, @Body() body: any) {
    return this.service.convertProforma(Number(id), body);
  }

  @Post(':id/refresh-format')
  refreshFormat(@Param('id') id: string) {
    return this.service.refreshFormat(Number(id));
  }

  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.service.recordPayment(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.hardDelete(Number(id)); }
}
