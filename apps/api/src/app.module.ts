import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { VendorPayablesModule } from './modules/vendor-payables/vendor-payables.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PassbookModule } from './modules/passbook/passbook.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    SettingsModule,
    CategoriesModule,
    VendorsModule,
    ClientsModule,
    BookingsModule,
    InvoicesModule,
    VendorPayablesModule,
    ReportsModule,
    UploadsModule,
    PassbookModule,
    AccountsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
