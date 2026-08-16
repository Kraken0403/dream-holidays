import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    if (!normalizedEmail || !normalizedPassword) {
      throw new UnauthorizedException('Email and password are required.');
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.active) {
      this.logger.warn(`Login rejected during user lookup email=${normalizedEmail || '<empty>'}`);
      throw new UnauthorizedException('Invalid login credentials.');
    }

    const valid = await bcrypt.compare(normalizedPassword, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Login rejected due to password mismatch email=${normalizedEmail}`);
      throw new UnauthorizedException('Invalid login credentials.');
    }

    this.logger.log(`Login successful email=${normalizedEmail} userId=${user.id} role=${user.role}`);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
