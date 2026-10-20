-- A listing is addressed by its slug alone.
--
-- `/products/<merchantId>/<slug>` was the shape a per-seller shopfront needs:
-- the slug only had to be unique inside one store. On a single marketplace the
-- merchant id in the path is noise, and the slug has to stand on its own.

-- Any existing collisions across merchants get a numeric suffix, oldest row
-- keeping the bare slug. Product creation already appends a random suffix, so
-- this is expected to be a no-op -- but adding a unique index without it would
-- fail the migration on exactly the database that needed it most.
WITH ranked AS (
  SELECT "id",
         "slug",
         row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS n
  FROM "Product"
)
UPDATE "Product" p
SET "slug" = ranked."slug" || '-' || ranked.n
FROM ranked
WHERE p."id" = ranked."id" AND ranked.n > 1;

DROP INDEX IF EXISTS "Product_merchantId_slug_key";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
