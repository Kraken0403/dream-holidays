import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const serviceMatrix: Record<string, Record<string, string[]>> = {
  'Air Ticket': {
    International: [
      'CLEARTRIP','TBO-258','TBO-117','MMTMYPARTNER','TRAVCLAN','FLY24HRS','VIETJET','AIRIXB','AIRIQ','FLYGOSMART','FLIGHTWORTH','RICHA','RIYA','SHREE SATI','INDIGO','SPICEJET'
    ],
    Domestic: [
      'CLEARTRIP','TBO-258','TBO-117','MMTMYPARTNER','TRAVCLAN','FLY24HRS','VIETJET','AIRIXB','AIRIQ','FLYGOSMART','FLIGHTWORTH','RICHA','RIYA','SHREE SATI','INDIGO','SPICEJET'
    ]
  },
  'Hotel Booking': {
    International: ['CLEARTRIP','TBO-258','TBO-117','MMTMYPARTNER','TRAVCLAN','REZLIVE','GRNCONNECT','AGODA','B2C','OTHER'],
    Domestic: ['CLEARTRIP','TBO-258','TBO-117','MMTMYPARTNER','TRAVCLAN','REZLIVE','GRNCONNECT','AGODA','B2C','OTHER']
  },
  Visa: {
    General: ['EMERALD VOYEGES','TAJ WORLD TRAVEL','ATLAS','ATLYS','STAMPMYVISA','TELEPORT']
  },
  Passport: {
    General: ['PASSPORTINDIA']
  },
  'Rail Ticket': {
    General: ['IRCTC','EURORAIL','TBO-258','TBO-117']
  },
  'Bus Ticket': {
    General: ['TBO','REDBUS','PAYTM']
  },
  Forex: {
    General: ['PAUL MERCHANT','VIVEK PARAB','BHRUGESH','DHARMIN']
  },
  'Rent a Car': {
    General: ['A2Z','AMIT SHAH','AMIT KOSHTI','XPERIENCE BHARAT','VIPUL DAVE','STEPHEN']
  },
  'Travel Insurance': {
    General: ['JANARDAN','BHAVIK','AMIT PATEL','ACKO','TBO-258','TBO-117','ATLYS','MMTMYPARTNER']
  },
  'Cruise Booking': {
    General: ['DPAULS','ARK','TBO-258','TBO-117']
  },
  'Tour Package': {
    International: ['TRAVCLAN','TBO-258','TBO-117','REZLIVE','FULL CIRCLE','BALITRIP','BALIWISATA','SYNERGY','RK VACATION','YOUR VACATION','ASIAN SEASON','OTP DMC'],
    Domestic: ['PARAMOUNT','DECENT HOSPITALITY','VIPUL DAVE','A2Z HOLIDAYS','TRAVCLAN','DIAMOND TOURS','SYNERGY','CLASSIC HOLIDAYS','NEPTUNE HOLIDAYS','SNOW VALLEY TOURS']
  }
};

const defaultSettings = [
  { key: 'financialYearStartMonth', value: 4, description: 'April = 4 for Indian financial year.' },
  { key: 'defaultCurrency', value: 'INR', description: 'Default accounting currency.' },
  { key: 'invoiceNumberFormat', value: '{PREFIX}/{FY}/{NUMBER}', description: 'Invoice number format.' },
  { key: 'paymentModes', value: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card'], description: 'Allowed payment modes.' },
  { key: 'defaultDueDays', value: 7, description: 'Default invoice due days.' },
  { key: 'dateFormat', value: 'DD/MM/YYYY', description: 'Application-wide displayed date format.' },
  { key: 'roundingEnabled', value: true, description: 'Whether invoice round off is enabled.' }
];

async function upsertLedger(code: string, name: string, type: string) {
  return prisma.ledgerAccount.upsert({
    where: { code },
    update: { name, type },
    create: { code, name, type }
  });
}

async function main() {
  const adminEmail = String(process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.INITIAL_ADMIN_PASSWORD || '');
  const adminName = String(process.env.INITIAL_ADMIN_NAME || 'Dream Holidays Admin').trim();

  if (adminEmail || adminPassword) {
    if (!adminEmail || adminPassword.length < 8) {
      throw new Error('Set INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD of at least 8 characters before seeding.');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName, passwordHash, role: UserRole.ADMIN, active: true },
      create: { name: adminName, email: adminEmail, passwordHash, role: UserRole.ADMIN }
    });
  } else {
    console.log('Initial admin skipped; no INITIAL_ADMIN_EMAIL/PASSWORD were supplied.');
  }

  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Dream Holidays',
      legalName: 'Dream Holidays',
      invoicePrefix: 'DH',
      proformaPrefix: 'DH-PI',
      creditNotePrefix: 'DH-CN',
      email: 'accounts@dreamholidays.local',
      phone: '',
      addressLine1: '',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      invoiceTerms: 'Payment due as per agreed terms. This is a system-generated invoice.'
    }
  });

  await prisma.companyBankAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyId: company.id,
      bankName: 'Default Bank',
      accountName: 'Dream Holidays',
      accountNumber: '0000000000',
      ifscCode: 'CHANGE0000',
      isDefault: true
    }
  });

  for (const setting of defaultSettings) {
    await prisma.globalSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting
    });
  }

  const categoryByName = new Map<string, number>();
  for (const [parentName, subMap] of Object.entries(serviceMatrix)) {
    const parent = await prisma.serviceCategory.upsert({
      where: { slug: slugify(parentName) },
      update: { name: parentName, active: true },
      create: { name: parentName, slug: slugify(parentName), active: true }
    });
    categoryByName.set(parentName, parent.id);

    for (const subName of Object.keys(subMap)) {
      if (subName === 'General') continue;
      const fullName = `${parentName} - ${subName}`;
      const child = await prisma.serviceCategory.upsert({
        where: { slug: slugify(fullName) },
        update: { name: subName, parentId: parent.id, active: true },
        create: { name: subName, slug: slugify(fullName), parentId: parent.id, active: true }
      });
      categoryByName.set(fullName, child.id);
    }
  }

  const vendorNames = new Set<string>();
  for (const subMap of Object.values(serviceMatrix)) {
    for (const vendors of Object.values(subMap)) {
      vendors.forEach(v => vendorNames.add(v.trim()));
    }
  }

  const vendorByName = new Map<string, number>();
  for (const name of vendorNames) {
    const vendor = await prisma.vendor.upsert({
      where: { code: slugify(name).toUpperCase() },
      update: { name, active: true },
      create: { name, code: slugify(name).toUpperCase(), active: true }
    });
    vendorByName.set(name, vendor.id);
  }

  for (const [parentName, subMap] of Object.entries(serviceMatrix)) {
    for (const [subName, vendors] of Object.entries(subMap)) {
      const categoryKey = subName === 'General' ? parentName : `${parentName} - ${subName}`;
      const categoryId = categoryByName.get(categoryKey)!;
      for (const vendorName of vendors) {
        const vendorId = vendorByName.get(vendorName.trim())!;
        await prisma.vendorServiceCategory.upsert({
          where: { vendorId_categoryId: { vendorId, categoryId } },
          update: {},
          create: { vendorId, categoryId }
        });
      }
    }
  }

  await upsertLedger('BANK', 'Default Bank / Cash', 'ASSET');
  await upsertLedger('SALES', 'Sales Revenue', 'INCOME');
  await upsertLedger('PURCHASE', 'Vendor Cost / Purchases', 'EXPENSE');
  await upsertLedger('CANCELLATION_INCOME', 'Cancellation Fee Income', 'INCOME');
  await upsertLedger('CANCELLATION_EXPENSE', 'Vendor Cancellation Charges', 'EXPENSE');
  await upsertLedger('CLIENTS', 'Client Receivables Control', 'ASSET');
  await upsertLedger('VENDORS', 'Vendor Payables Control', 'LIABILITY');

  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
