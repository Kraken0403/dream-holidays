import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id/deletion-preview')
  deletionPreview(@Param('id') id: string) { return this.service.deletionPreview(Number(id)); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(Number(id)); }

  @Post()
  create(@Body() body: any, @Req() req: any) { return this.service.create(body, req.user?.id); }

  @Post(':id/version')
  createVersion(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.createVersion(Number(id), body, req.user?.id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.update(Number(id), body, req.user?.id); }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.cancel(Number(id), body, req.user?.id); }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) { return this.service.hardDelete(Number(id), req.user?.id); }

  @Post(':id/cancellation/post-charges')
  postCancellationCharges(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.service.postCancellationCharges(Number(id), body, req.user?.id); }

  @Post(':id/recalculate')
  recalculate(@Param('id') id: string, @Req() req: any) { return this.service.recalculate(Number(id), req.user?.id); }
}
