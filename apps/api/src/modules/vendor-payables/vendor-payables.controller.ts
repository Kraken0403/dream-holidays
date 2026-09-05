import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorPayablesService } from './vendor-payables.service';

@UseGuards(JwtAuthGuard)
@Controller('vendor-payables')
export class VendorPayablesController {
  constructor(private readonly service: VendorPayablesService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Post('from-bookings')
  generateFromBookings(@Body() body: any) {
    return this.service.generateFromBookings(body.bookingIds);
  }

  @Post('from-booking/:bookingId')
  generateFromBooking(@Param('bookingId') bookingId: string) {
    return this.service.generateFromBooking(Number(bookingId));
  }

  @Get(':id/deletion-preview')
  deletionPreview(@Param('id') id: string) { return this.service.deletionPreview(Number(id)); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(Number(id)); }

  @Post()
  create(@Body() body: any) { return this.service.createManual(body); }

  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.service.recordPayment(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.hardDelete(Number(id)); }
}
