ALTER TABLE `Booking` ADD COLUMN `clientSnapshot` JSON NULL;
ALTER TABLE `Invoice` ADD COLUMN `clientSnapshot` JSON NULL;

UPDATE `Booking` b
JOIN `Client` c ON c.id = b.clientId
SET b.clientSnapshot = JSON_OBJECT(
  'name', c.name,
  'companyName', c.companyName,
  'phone', c.phone,
  'email', c.email,
  'gstNumber', c.gstNumber,
  'panNumber', c.panNumber,
  'billingAddress', c.billingAddress,
  'state', c.state
)
WHERE b.clientSnapshot IS NULL;

UPDATE `Invoice` i
JOIN `Client` c ON c.id = i.clientId
SET i.clientSnapshot = JSON_OBJECT(
  'name', c.name,
  'companyName', c.companyName,
  'phone', c.phone,
  'email', c.email,
  'gstNumber', c.gstNumber,
  'panNumber', c.panNumber,
  'billingAddress', c.billingAddress,
  'state', c.state
)
WHERE i.clientSnapshot IS NULL;
