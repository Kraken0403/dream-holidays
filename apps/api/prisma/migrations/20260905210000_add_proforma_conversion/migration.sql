ALTER TABLE `Invoice`
  ADD COLUMN `convertedFromProformaId` INTEGER NULL,
  ADD UNIQUE INDEX `Invoice_convertedFromProformaId_key`(`convertedFromProformaId`),
  ADD CONSTRAINT `Invoice_convertedFromProformaId_fkey`
    FOREIGN KEY (`convertedFromProformaId`) REFERENCES `Invoice`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Invoice`
  MODIFY `status` ENUM('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CONVERTED') NOT NULL DEFAULT 'DRAFT';
