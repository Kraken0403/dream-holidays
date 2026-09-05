-- Booking revisions
ALTER TABLE `Booking` ADD COLUMN `currentVersion` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `BookingVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `changeType` VARCHAR(191) NOT NULL,
    `changeNote` TEXT NULL,
    `snapshot` JSON NOT NULL,
    `changedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BookingVersion_bookingId_version_key`(`bookingId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Non-posting proformas and auditable credit-note reversals
ALTER TABLE `Invoice`
    ADD COLUMN `documentType` ENUM('INVOICE', 'PROFORMA', 'CREDIT_NOTE') NOT NULL DEFAULT 'INVOICE',
    ADD COLUMN `originalInvoiceId` INTEGER NULL,
    ADD COLUMN `cancellationId` INTEGER NULL;

ALTER TABLE `VendorBill`
    ADD COLUMN `documentType` ENUM('BILL', 'CREDIT_NOTE') NOT NULL DEFAULT 'BILL',
    ADD COLUMN `originalBillId` INTEGER NULL,
    ADD COLUMN `cancellationId` INTEGER NULL;

ALTER TABLE `JournalEntry` MODIFY `sourceType` ENUM('INVOICE', 'CLIENT_PAYMENT', 'VENDOR_BILL', 'VENDOR_PAYMENT', 'CREDIT_NOTE', 'VENDOR_CREDIT_NOTE', 'REFUND', 'MANUAL') NOT NULL DEFAULT 'MANUAL';

CREATE TABLE `BookingCancellation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `cancelledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clientChargeSubtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `clientChargeTax` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `clientChargeTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `reversedInvoiceTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `reversedVendorBillTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BookingCancellation_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BookingCancellationVendorCharge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cancellationId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BookingVersion` ADD CONSTRAINT `BookingVersion_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BookingCancellation` ADD CONSTRAINT `BookingCancellation_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BookingCancellationVendorCharge` ADD CONSTRAINT `BookingCancellationVendorCharge_cancellationId_fkey` FOREIGN KEY (`cancellationId`) REFERENCES `BookingCancellation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BookingCancellationVendorCharge` ADD CONSTRAINT `BookingCancellationVendorCharge_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_originalInvoiceId_fkey` FOREIGN KEY (`originalInvoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_cancellationId_fkey` FOREIGN KEY (`cancellationId`) REFERENCES `BookingCancellation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `VendorBill` ADD CONSTRAINT `VendorBill_originalBillId_fkey` FOREIGN KEY (`originalBillId`) REFERENCES `VendorBill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `VendorBill` ADD CONSTRAINT `VendorBill_cancellationId_fkey` FOREIGN KEY (`cancellationId`) REFERENCES `BookingCancellation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve an initial immutable snapshot for existing bookings.
INSERT INTO `BookingVersion` (`bookingId`, `version`, `changeType`, `changeNote`, `snapshot`, `createdAt`)
SELECT `id`, 1, 'MIGRATED', 'Initial version captured during booking versioning migration',
       JSON_OBJECT(
         'id', `id`, 'bookingNumber', `bookingNumber`, 'bookingDate', `bookingDate`,
         'clientId', `clientId`, 'companyId', `companyId`, 'salesPersonId', `salesPersonId`,
         'title', `title`, 'destination', `destination`, 'travelStartDate', `travelStartDate`,
         'travelEndDate', `travelEndDate`, 'passengerCount', `passengerCount`, 'status', `status`,
         'internalNotes', `internalNotes`, 'clientNotes', `clientNotes`,
         'totalSaleAmount', `totalSaleAmount`, 'totalVendorCost', `totalVendorCost`, 'grossMargin', `grossMargin`
       ), `createdAt`
FROM `Booking`;
