-- A merchant account, not a store.
--
-- Nexus is one marketplace: a seller lists products into the shared shopfront
-- and never operates a shopfront of their own. The schema still described the
-- Shopify-shaped product it started as -- a `Store` with a hostname, a theme,
-- its own pages, its own navigation and its own custom domains.
--
-- Everything here is a RENAME, never a drop-and-recreate, so every existing
-- row keeps its id and its foreign keys. The four dropped tables are the
-- storefront-builder features themselves, which no longer have a UI, an API
-- route or a controller.

-- 1. The storefront-builder tables.

DROP TABLE IF EXISTS "StorefrontConfig" CASCADE;
DROP TABLE IF EXISTS "StorePage" CASCADE;
DROP TABLE IF EXISTS "NavigationMenu" CASCADE;
DROP TABLE IF EXISTS "CustomDomain" CASCADE;
DROP TYPE IF EXISTS "DomainStatus";

-- 2. Columns describing a shopfront of one's own.
ALTER TABLE "StoreSettings"
  DROP COLUMN IF EXISTS "storeUrl",
  DROP COLUMN IF EXISTS "faviconUrl",
  DROP COLUMN IF EXISTS "announcementText",
  DROP COLUMN IF EXISTS "activeTheme",
  DROP COLUMN IF EXISTS "primaryColor",
  DROP COLUMN IF EXISTS "secondaryColor",
  DROP COLUMN IF EXISTS "accentColor",
  DROP COLUMN IF EXISTS "fontFamily",
  DROP COLUMN IF EXISTS "customDomain",
  DROP COLUMN IF EXISTS "seoTitle",
  DROP COLUMN IF EXISTS "seoDescription",
  DROP COLUMN IF EXISTS "socialImage";

ALTER TABLE "Store" DROP COLUMN IF EXISTS "domain";

-- `maxStores` was never read: one account owns exactly one merchant record,
-- enforced by the partial unique index on MerchantMember(userId) WHERE OWNER.
ALTER TABLE "SubscriptionPlan"
  DROP COLUMN IF EXISTS "customDomainAllowed",
  DROP COLUMN IF EXISTS "maxStores";

-- 3. The tables and the enum.
ALTER TYPE "StoreStatus" RENAME TO "MerchantStatus";
ALTER TABLE "Store" RENAME TO "Merchant";
ALTER TABLE "StoreMember" RENAME TO "MerchantMember";
ALTER TABLE "StoreSettings" RENAME TO "MerchantSettings";
ALTER TABLE "MerchantSettings" RENAME COLUMN "storeName" TO "displayName";

-- 4. The foreign key on every table that points at a merchant.
ALTER TABLE "MerchantMember" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "ProductCategory" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Product" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "InventoryItem" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "InventoryMovement" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Customer" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Order" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Discount" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Notification" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "MerchantSettings" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "TeamInvitation" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "AuditLog" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Payment" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Transaction" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "WebhookEvent" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Refund" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "ShippingZone" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "ShippingMethod" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Shipment" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Subscription" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "BillingCustomer" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "BillingTransaction" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Invoice" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "AiInsight" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "AiConversation" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "AiUsageEvent" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "ProductReview" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "MerchantPayoutAccount" RENAME COLUMN "storeId" TO "merchantId";
ALTER TABLE "Payout" RENAME COLUMN "storeId" TO "merchantId";

-- 5. Index and constraint names.
--
-- Postgres keeps the old name when a table or column is renamed, so without
-- this every index would still read "Store_..." / "..._storeId_key" and the
-- next `prisma migrate dev` would see drift and try to rebuild them.
DO $$
DECLARE r record; renamed text;
BEGIN
  FOR r IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'i'
      AND (c.relname LIKE 'Store%' OR c.relname LIKE '%storeId%')
  LOOP
    renamed := replace(replace(r.name, 'storeId', 'merchantId'), 'Store', 'Merchant');
    IF renamed <> r.name THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', r.name, renamed);
    END IF;
  END LOOP;

  FOR r IN
    SELECT con.conname AS name, rel.relname AS tbl
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND (con.conname LIKE 'Store%' OR con.conname LIKE '%storeId%')
  LOOP
    renamed := replace(replace(r.name, 'storeId', 'merchantId'), 'Store', 'Merchant');
    IF renamed <> r.name THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tbl, r.name, renamed);
    END IF;
  END LOOP;
END $$;

-- 6. Naira is the platform's trading currency, so it is also the default.
ALTER TABLE "Merchant" ALTER COLUMN "currency" SET DEFAULT 'NGN — Nigerian Naira';
ALTER TABLE "Merchant" ALTER COLUMN "timezone" SET DEFAULT 'Africa/Lagos';
ALTER TABLE "Merchant" ALTER COLUMN "industry" SET DEFAULT 'General';
ALTER TABLE "MerchantSettings" ALTER COLUMN "currency" SET DEFAULT 'NGN — Nigerian Naira';
ALTER TABLE "MerchantSettings" ALTER COLUMN "timezone" SET DEFAULT 'Africa/Lagos';
ALTER TABLE "MerchantSettings" ALTER COLUMN "industry" SET DEFAULT 'General';
ALTER TABLE "MerchantSettings" ALTER COLUMN "displayName" SET DEFAULT 'New merchant';
ALTER TABLE "MerchantSettings" ALTER COLUMN "description" DROP DEFAULT;
ALTER TABLE "MerchantSettings" ALTER COLUMN "contactEmail" DROP DEFAULT;
ALTER TABLE "MerchantSettings" ALTER COLUMN "contactPhone" DROP DEFAULT;
ALTER TABLE "MerchantSettings" ALTER COLUMN "address" DROP DEFAULT;

-- Configuration follows the platform. Orders, payments and payouts keep the
-- currency they were actually transacted in -- those are records of what was
-- charged, not settings.
UPDATE "Merchant" SET "currency" = 'NGN — Nigerian Naira' WHERE "currency" LIKE 'USD%';
UPDATE "MerchantSettings" SET "currency" = 'NGN — Nigerian Naira' WHERE "currency" LIKE 'USD%';
