ALTER TABLE `ClientPayment`
  ADD COLUMN `proofUrl` VARCHAR(191) NULL,
  ADD COLUMN `proofOriginalName` VARCHAR(191) NULL;

ALTER TABLE `VendorPayment`
  ADD COLUMN `proofUrl` VARCHAR(191) NULL,
  ADD COLUMN `proofOriginalName` VARCHAR(191) NULL;
