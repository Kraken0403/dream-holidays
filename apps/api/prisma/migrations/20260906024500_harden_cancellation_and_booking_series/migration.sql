-- Separate actual booking versions from audit revisions and add atomic document numbering.
CREATE TABLE `DocumentSequence` (
    `key` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Booking`
    ADD COLUMN `bookingVersion` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `seriesRootId` INTEGER NULL,
    ADD COLUMN `previousVersionId` INTEGER NULL;

CREATE UNIQUE INDEX `Booking_previousVersionId_key` ON `Booking`(`previousVersionId`);
CREATE INDEX `Booking_seriesRootId_bookingVersion_idx` ON `Booking`(`seriesRootId`, `bookingVersion`);

ALTER TABLE `Booking`
    ADD CONSTRAINT `Booking_seriesRootId_fkey` FOREIGN KEY (`seriesRootId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `Booking_previousVersionId_fkey` FOREIGN KEY (`previousVersionId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BookingCancellation`
    ADD COLUMN `clientChargeInvoiceCreated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `vendorChargeBillsCreated` BOOLEAN NOT NULL DEFAULT false;

-- Dedicated cancellation ledgers keep cancellation revenue/cost visible in P&L and trial balance.
INSERT INTO `LedgerAccount` (`name`, `code`, `type`, `active`, `createdAt`, `updatedAt`)
VALUES ('Cancellation Fee Income', 'CANCELLATION_INCOME', 'INCOME', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `type` = VALUES(`type`), `active` = true, `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `LedgerAccount` (`name`, `code`, `type`, `active`, `createdAt`, `updatedAt`)
VALUES ('Vendor Cancellation Charges', 'CANCELLATION_EXPENSE', 'EXPENSE', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `type` = VALUES(`type`), `active` = true, `updatedAt` = CURRENT_TIMESTAMP(3);
