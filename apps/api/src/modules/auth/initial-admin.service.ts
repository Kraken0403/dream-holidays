import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InitialAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('AUTO_CREATE_INITIAL_ADMIN') !== 'true') return;

    const email = String(this.config.get<string>('INITIAL_ADMIN_EMAIL') || '')
      .trim()
      .toLowerCase();
    const password = String(this.config.get<string>('INITIAL_ADMIN_PASSWORD') || '');
    if (!email || password.length < 8) {
      this.logger.error(
        'Initial admin was not created. Set INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD of at least 8 characters.',
      );
      return;
    }

    const [configuredUser, activeAdmins] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN, active: true } }),
    ]);
    if (configuredUser || activeAdmins > 0) return;

    await this.prisma.user.create({
      data: {
        name: this.config.get<string>('INITIAL_ADMIN_NAME') || 'Dream Holidays Admin',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
        active: true,
      },
    });
    this.logger.log(`Created the initial administrator account for ${email}.`);
  }
}
