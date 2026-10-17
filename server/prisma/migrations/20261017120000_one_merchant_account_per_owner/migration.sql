-- One merchant account per owner.
--
-- Nexus is a single marketplace: a merchant signs up and sells from their
-- merchant account. They do not run several independent shops. The schema
-- never said so, though — `@@unique([userId, storeId])` only stopped a user
-- joining the SAME merchant record twice, so nothing prevented one user from
-- owning several.
--
-- That ambiguity is why `auth.middleware.ts` and `auth.controller.ts` reached
-- for `memberships[0]`: with several possible answers, the code picked
-- whichever row the database happened to return first. Whose products a
-- merchant saw then depended on row ordering.
--
-- A partial unique index is the right shape: at most one OWNER membership per
-- user, while leaving STAFF and ADMIN memberships unconstrained so a person
-- can still be invited onto someone else's merchant account as a team member.
--
-- Prisma cannot express a partial unique index declaratively, hence the raw
-- SQL. `schema.prisma` carries a matching comment so the two do not drift.
CREATE UNIQUE INDEX "StoreMember_one_owner_account_per_user"
  ON "StoreMember" ("userId")
  WHERE "role" = 'OWNER';
