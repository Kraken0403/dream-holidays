import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put()
  upsertMany(@Body() body: Record<string, any>) {
    return this.service.upsertMany(body);
  }
}
