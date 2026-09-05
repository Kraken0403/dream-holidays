-- TiDB validates every schema object in a multi-change ALTER TABLE against the
-- schema as it exists before the statement. Add the column, index and FK in
-- separate statements so the new column exists before it is referenced.
ALTER TABLE `Invoice`
  ADD COLUMN `convertedFromProformaId` INTEGER NULL;

CREATE UNIQUE INDEX `Invoice_convertedFromProformaId_key`
  ON `Invoice`(`convertedFromProformaId`);

ALTER TABLE `Invoice`
  ADD CONSTRAINT `Invoice_convertedFromProformaId_fkey`
    FOREIGN KEY (`convertedFromProformaId`) REFERENCES `Invoice`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Invoice`
  MODIFY `status` ENUM('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CONVERTED') NOT NULL DEFAULT 'DRAFT';
